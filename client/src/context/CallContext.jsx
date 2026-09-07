import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import API from "../api";
import { getUser } from "../utils/storage";

/**
 * Audio/video calling engine.
 *
 * Real WebRTC media (camera + mic) between two browsers, with signaling
 * relayed through the REST API (`/api/calls/:id/signal`) and polled —
 * no socket server required. Works out of the box on localhost/LAN.
 */
const CallContext = createContext(null);

// Public STUN servers so peers can discover each other beyond plain host
// candidates (required across devices/NATs; harmless on localhost).
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

// If the callee's answer never shows up, the caller re-sends its offer.
const OFFER_RETRY_MS = 5000;

export function CallProvider({ children }) {
  const me = getUser();
  const meId = me ? String(me._id || me.id || "") : "";

  const [call, setCall] = useState(null); // shaped doc from /calls/mine/active
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const offeredRef = useRef(false);
  const answeredRef = useRef(false);
  const offeredAtRef = useRef(0);
  const appliedRef = useRef(0);
  const pendingIceRef = useRef([]);
  const connectedOnceRef = useRef(false);

  /* ---------- media / peer helpers ---------- */

  const ensureMedia = useCallback(async (type) => {
    if (localRef.current) return localRef.current;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // getUserMedia only exists in secure contexts — http:// over a LAN IP
      // is blocked by every browser (localhost / https:// are fine).
      throw new Error(
        "Camera/microphone need a secure context (open via localhost or HTTPS)."
      );
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
    } catch (err) {
      if (type === "video") {
        // No camera (or it's blocked): degrade this video call to audio-only
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setError("No camera available — continuing as an audio call.");
      } else {
        throw err;
      }
    }
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const sendSignal = useCallback(async (callId, payload) => {
    try {
      await API.post(`/calls/${callId}/signal`, { payload });
    } catch {
      /* transient errors are tolerated */
    }
  }, []);

  const setupPeer = useCallback(
    (callId, stream) => {
      if (pcRef.current) return pcRef.current;
      // Public STUN servers: lets peers connect across devices/networks,
      // not just two tabs on the same machine.
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const rs = new MediaStream();
      setRemoteStream(rs);
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => {
          if (!rs.getTracks().includes(t)) rs.addTrack(t);
        });
      };
      pc.onicecandidate = (e) => {
        if (e.candidate)
          sendSignal(callId, { candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("Connection failed — check your network and try again.");
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [sendSignal]
  );

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    const queue = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const c of queue) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  }, []);

  const handleSignal = useCallback(
    async (sig, doc) => {
      const p = sig.payload || {};
      try {
        if (p.sdp && p.sdp.type === "offer") {
          // Ignore a retransmitted offer while we are already answering one
          if (
            pcRef.current &&
            pcRef.current.signalingState === "have-remote-offer"
          )
            return;
          // Callee path: build peer lazily when the offer arrives
          const stream = await ensureMedia(doc.type);
          const pc = setupPeer(doc._id, stream);
          await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(doc._id, { sdp: { type: "answer", sdp: answer.sdp } });
          await flushIce();
        } else if (p.sdp && p.sdp.type === "answer") {
          const pc = pcRef.current;
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
            answeredRef.current = true; // stops the caller's offer-retry
            await flushIce();
          }
        } else if (p.candidate) {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(p.candidate);
            } catch {
              /* stale candidate */
            }
          } else {
            pendingIceRef.current.push(p.candidate);
          }
        }
      } catch {
        /* ignore malformed signals */
      }
    },
    [ensureMedia, setupPeer, sendSignal, flushIce]
  );

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localRef.current) {
      localRef.current.getTracks().forEach((t) => t.stop());
      localRef.current = null;
    }
    offeredRef.current = false;
    answeredRef.current = false;
    offeredAtRef.current = 0;
    appliedRef.current = 0;
    pendingIceRef.current = [];
    connectedOnceRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCamOff(false);
    setStartedAt(null);
    setError("");
  }, []);

  /* ---------- public actions ---------- */

  const startCall = useCallback(
    async (partner, type) => {
      if (!meId || !partner) return;
      try {
        const res = await API.post("/calls", {
          callee: String(partner._id || partner.id),
          type,
        });
        cleanup();
        // Count only signals from the OTHER party (the relay array also
        // holds our own) so the cursor stays in sync with handleSignal.
        appliedRef.current = (res.data.signals || []).filter(
          (s) => String(s.from) !== meId
        ).length;
        setCall(res.data);
        // Ask for mic/cam while the phone rings
        await ensureMedia(type).catch(() =>
          setError("Camera/microphone access was denied.")
        );
      } catch (err) {
        alert(
          err?.response?.data?.message ||
            err?.response?.data ||
            "Could not start the call"
        );
      }
    },
    [meId, cleanup, ensureMedia]
  );

  const acceptCall = useCallback(async () => {
    if (!call) return;
    try {
      await API.put(`/calls/${call._id}/accept`);
      setCall((prev) => (prev ? { ...prev, status: "connected" } : prev));
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data || "Accept failed");
    }
  }, [call]);

  const declineCall = useCallback(async () => {
    if (!call) return;
    try {
      await API.put(`/calls/${call._id}/decline`);
    } catch {
      /* leaving anyway */
    }
    cleanup();
    setCall(null);
  }, [call, cleanup]);

  const endCall = useCallback(async () => {
    if (call) {
      try {
        await API.put(`/calls/${call._id}/end`);
      } catch {
        /* ignore */
      }
    }
    cleanup();
    setCall(null);
  }, [call, cleanup]);

  const toggleMute = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    const track = s.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    const track = s.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOff(!track.enabled);
    }
  }, []);

  /* ---------- polling loop: heartbeat of the call ---------- */

  useEffect(() => {
    if (!meId) return undefined;
    let alive = true;

    const tick = async () => {
      let doc = null;
      try {
        const r = await API.get("/calls/mine/active");
        doc = r.data;
      } catch {
        return;
      }
      if (!alive) return;

      if (!doc) {
        // No live call server-side -> someone ended/declined it
        setCall((prev) => {
          if (prev) cleanup();
          return null;
        });
        return;
      }

      // Relay any NEW signals exactly once — but ONLY signals from the other
      // party. The shared array also contains OUR OWN offers/answers/ICE;
      // re-applying our own offer corrupted the WebRTC negotiation state
      // (self-answer + dropped real answer), which broke call setup.
      const incoming = (doc.signals || []).filter(
        (s) => String(s.from) !== meId
      );
      const fresh = incoming.slice(appliedRef.current);
      appliedRef.current = incoming.length;

      setCall((prev) => ({ ...(prev || {}), ...doc }));
      for (const sig of fresh) {
        await handleSignal(sig, doc);
      }
      if (!alive) return;

      // Caller starts negotiation once the callee accepts
      if (
        doc.role === "caller" &&
        doc.status === "connected" &&
        !pcRef.current &&
        !offeredRef.current
      ) {
        offeredRef.current = true;
        offeredAtRef.current = Date.now();
        try {
          const stream = await ensureMedia(doc.type).catch(() => {
            setError("Camera/microphone access was denied.");
            throw new Error("no-media");
          });
          const pc = setupPeer(doc._id, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(doc._id, { sdp: { type: "offer", sdp: offer.sdp } });
        } catch {
          offeredRef.current = false;
        }
      } else if (
        doc.role === "caller" &&
        doc.status === "connected" &&
        pcRef.current &&
        offeredRef.current &&
        !answeredRef.current &&
        Date.now() - offeredAtRef.current > OFFER_RETRY_MS
      ) {
        // The answer never arrived (a signal got lost on the way) ->
        // re-send our offer so the call can still connect.
        offeredAtRef.current = Date.now();
        const desc = pcRef.current.localDescription;
        if (desc)
          sendSignal(doc._id, { sdp: { type: "offer", sdp: desc.sdp } });
      }

      if (doc.status === "connected" && !connectedOnceRef.current) {
        connectedOnceRef.current = true;
        setStartedAt(Date.now());
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [meId, cleanup, handleSignal, ensureMedia, setupPeer, sendSignal]);

  // Stop camera/mic when the provider unmounts (logout / full reload)
  useEffect(() => () => cleanup(), [cleanup]);

  const value = useMemo(
    () => ({
      call,
      localStream,
      remoteStream,
      muted,
      camOff,
      startedAt,
      error,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleCam,
    }),
    [
      call, localStream, remoteStream, muted, camOff, startedAt, error,
      startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}