const router = require("express").Router();
const Call = require("../models/Call");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// How long a "ringing" call may go unanswered before it auto-closes (missed),
// and how long a "connected" call may go without a heartbeat before we assume
// both tabs are gone (crash / closed laptop). Without this, dead call docs
// stayed live forever and blocked every future call with "user is busy".
const RING_TIMEOUT_MS = 45 * 1000;
const CONNECTED_TIMEOUT_MS = 90 * 1000;

// Shape a call doc from MY perspective: my role + partner info + signals
async function shape(call, me) {
  const obj = call.toObject();
  const iAmCaller = String(obj.caller) === me;
  const otherId = iAmCaller ? obj.callee : obj.caller;
  const u = await User.findById(otherId).select("username profilePicture");
  return {
    _id: obj._id,
    type: obj.type,
    status: obj.status,
    role: iAmCaller ? "caller" : "callee",
    partner: u
      ? {
          _id: u._id,
          username: u.username,
          profilePicture: u.profilePicture,
        }
      : { _id: otherId, username: "Deleted User", profilePicture: "" },
    createdAt: obj.createdAt,
    signals: obj.signals || [],
  };
}

// Auto-close dead calls: an unanswered ring older than RING_TIMEOUT_MS or a
// "connected" call nobody has heartbeated for CONNECTED_TIMEOUT_MS. Both
// clients poll /mine/active every second, which doubles as the heartbeat.
async function closeIfStale(call) {
  const age = Date.now() - new Date(call.updatedAt).getTime();
  const expired =
    (call.status === "ringing" && age > RING_TIMEOUT_MS) ||
    (call.status === "connected" && age > CONNECTED_TIMEOUT_MS);
  if (!expired) return false;
  await call.updateOne({ $set: { status: "ended" } });
  call.status = "ended";
  return true;
}

// Start a call -> creates the "ringing" document
router.post("/", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const callee = String(req.body.callee || "");
    const type = req.body.type === "video" ? "video" : "audio";
    if (!callee || callee === me)
      return res.status(400).json("Invalid call target");

    const partner = await User.findById(callee);
    if (!partner) return res.status(404).json("User not found");

    const live = { $in: ["ringing", "connected"] };
    let imBusy = await Call.findOne({
      status: live,
      $or: [{ caller: me }, { callee: me }],
    });
    // A stale leftover call must not block new ones — clear it and continue
    if (imBusy && (await closeIfStale(imBusy))) imBusy = null;
    if (imBusy) return res.status(400).json("You are already in a call");

    let theyBusy = await Call.findOne({
      status: live,
      $or: [{ caller: callee }, { callee: callee }],
    });
    if (theyBusy && (await closeIfStale(theyBusy))) theyBusy = null;
    if (theyBusy) return res.status(400).json("User is busy right now");

    const call = await Call.create({ caller: me, callee, type });
    res.status(201).json(await shape(call, me));
  } catch (err) {
    res.status(500).json(err.message || "Failed to start the call");
  }
});

// Single endpoint that drives the whole call UI (polled by both sides):
// my current ringing/connected call from MY perspective, or null.
router.get("/mine/active", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const call = await Call.findOne({
      status: { $in: ["ringing", "connected"] },
      $or: [{ caller: me }, { callee: me }],
    })
      .sort({ updatedAt: -1 })
      .limit(1);
    if (!call) return res.status(200).json(null);
    if (await closeIfStale(call)) return res.status(200).json(null);
    // Heartbeat: both sides poll every second while a live call exists,
    // so touching updatedAt keeps genuinely-alive calls fresh while dead
    // ones age out and get reaped by closeIfStale above.
    if (call.status === "connected")
      await call.updateOne({ $set: { updatedAt: new Date() } });
    res.status(200).json(await shape(call, me));
  } catch (err) {
    res.status(500).json(err.message || "Failed to load call state");
  }
});

// Callee accepts a ringing call
router.put("/:id/accept", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json("Call not found");
    if (String(call.callee) !== me)
      return res.status(403).json("Only the receiver can accept");
    if (call.status !== "ringing")
      return res.status(400).json("Call is not ringing anymore");
    await call.updateOne({ $set: { status: "connected" } });
    call.status = "connected";
    res.status(200).json(await shape(call, me));
  } catch (err) {
    res.status(500).json(err.message || "Accept failed");
  }
});

// Callee declines a ringing call
router.put("/:id/decline", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json("Call not found");
    if (String(call.callee) !== me)
      return res.status(403).json("Only the receiver can decline");
    if (call.status !== "ringing") return res.status(200).json("Already over");
    await call.updateOne({ $set: { status: "declined" } });
    call.status = "declined";
    res.status(200).json(await shape(call, me));
  } catch (err) {
    res.status(500).json(err.message || "Decline failed");
  }
});

// Either side hangs up (works while ringing or connected)
router.put("/:id/end", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json("Call not found");
    if (
      String(call.caller) !== me &&
      String(call.callee) !== me
    )
      return res.status(403).json("Not your call");
    if (["ringing", "connected"].includes(call.status)) {
      await call.updateOne({ $set: { status: "ended" } });
      call.status = "ended";
    }
    res.status(200).json(await shape(call, me));
  } catch (err) {
    res.status(500).json(err.message || "End call failed");
  }
});

// Relay one WebRTC signal (offer / answer / ICE candidate)
router.post("/:id/signal", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json("Call not found");
    if (String(call.caller) !== me && String(call.callee) !== me)
      return res.status(403).json("Not your call");
    if (!req.body.payload || typeof req.body.payload !== "object")
      return res.status(400).json("Invalid signal payload");

    await call.updateOne({
      $push: {
        signals: {
          $each: [{ from: me, payload: req.body.payload }],
          $slice: -300, // cap the relay buffer
        },
      },
    });
    res.status(201).json("Signal sent");
  } catch (err) {
    res.status(500).json(err.message || "Signaling failed");
  }
});

module.exports = router;
