import React, { useEffect, useRef, useState } from "react";
import {
  FaPhone,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import Avatar from "./Avatar";
import { useCall } from "../context/CallContext";

/** Attaches a MediaStream to a <video> element. */
function Stream({ stream, className, isMuted }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return undefined;
    el.srcObject = stream;
    // Tracks can be added AFTER the stream was attached; re-assign so the
    // element reliably starts playing the incoming media.
    const sync = () => {
      el.srcObject = null;
      el.srcObject = stream;
    };
    stream.addEventListener("addtrack", sync);
    return () => stream.removeEventListener("addtrack", sync);
  }, [stream]);
  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      playsInline
      muted={isMuted}
    />
  );
}

function Timer({ startedAt }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!startedAt) {
      setS(0);
      return undefined;
    }
    const t = setInterval(
      () => setS(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [startedAt]);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="call-timer">
      {mm}:{ss}
    </span>
  );
}

/** Full-screen call experience: ringing, connecting and live media. */
export default function CallOverlay() {
  const {
    call,
    localStream,
    remoteStream,
    muted,
    camOff,
    startedAt,
    error,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCam,
  } = useCall();

  if (!call) return null;

  const incoming = call.role === "callee" && call.status === "ringing";
  const outgoing = call.role === "caller" && call.status === "ringing";
  const connected = call.status === "connected";
  const isVideo = call.type === "video";
  const hasRemote = Boolean(remoteStream);

  return (
    <div className={"call-overlay" + (isVideo ? " video" : "")}>
      <div className="call-stage">
        {isVideo && hasRemote && (
          <Stream stream={remoteStream} className="call-remote" />
        )}

        {!isVideo || !hasRemote ? (
          <div className="call-audio-face">
            <Avatar
              src={call.partner.profilePicture}
              name={call.partner.username}
              size="avatar-xl"
            />
            {(incoming || outgoing || !hasRemote) && <span className="ring-pulse" />}
          </div>
        ) : null}

        {isVideo && localStream && (
          <Stream stream={localStream} className="call-local" isMuted />
        )}
      </div>

      <div className="call-info">
        <h3>{call.partner.username}</h3>
        {incoming && <p>Incoming {call.type} call…</p>}
        {outgoing && <p>Calling…</p>}
        {connected &&
          (hasRemote ? (
            <Timer startedAt={startedAt} />
          ) : (
            <p>Connecting…</p>
          ))}
        {error && <p className="call-error">{error}</p>}
      </div>

      <div className="call-controls">
        {incoming ? (
          <>
            <button
              type="button"
              className="call-btn danger"
              title="Decline"
              onClick={declineCall}
            >
              <FaPhoneSlash />
            </button>
            <button
              type="button"
              className="call-btn success"
              title={`Accept ${call.type} call`}
              onClick={acceptCall}
            >
              {isVideo ? <FaVideo /> : <FaPhone />}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={"call-btn" + (muted ? " warn" : "")}
              title={muted ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>
            {isVideo && connected && (
              <button
                type="button"
                className={"call-btn" + (camOff ? " warn" : "")}
                title={camOff ? "Turn camera on" : "Turn camera off"}
                onClick={toggleCam}
              >
                {camOff ? <FaVideoSlash /> : <FaVideo />}
              </button>
            )}
            <button
              type="button"
              className="call-btn danger big"
              title="End call"
              onClick={endCall}
            >
              <FaPhoneSlash />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
