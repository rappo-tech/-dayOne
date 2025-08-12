"use client";
import { useRef, useState } from "react";

export default function Feed() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const startCall = async () => {
    // 1. Connect to WebSocket server
    wsRef.current = new WebSocket("wss://zoombackend-5nt9.onrender.com");
; // Replace with your Render WebSocket URL

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
    };

    wsRef.current.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      if (!pcRef.current) return;

      if (message.type === "offer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify(answer));
      } else if (message.type === "answer") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(message));
      } else if (message.type === "candidate") {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    };

    // 2. Create PeerConnection
    pcRef.current = new RTCPeerConnection();

    // 3. Show local camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    stream.getTracks().forEach(track => {
      pcRef.current?.addTrack(track, stream);
    });

    // 4. Play remote video when received
    pcRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // 5. Send ICE candidates to WebSocket
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
      }
    };

    // 6. Create offer
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    wsRef.current?.send(JSON.stringify(offer));
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold">WebRTC Video Call</h1>
      <div className="flex gap-4">
        <video ref={localVideoRef} autoPlay playsInline muted className="border w-64 h-48 bg-black" />
        <video ref={remoteVideoRef} autoPlay playsInline className="border w-64 h-48 bg-black" />
      </div>
      <button
        onClick={startCall}
        disabled={isConnected}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Start Call
      </button>
    </div>
  );
}
