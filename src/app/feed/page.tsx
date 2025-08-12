"use client";
import { useRef, useState, useCallback } from "react";

interface SignalMessage {
  type: string;
  roomId?: string;
  clientId?: string;
  to?: string;
  from?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  peers?: string[];
}

export default function Feed() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const otherPeerIdRef = useRef<string | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  // Generate unique client ID
  const clientId = useRef(Math.random().toString(36).substring(7));
  const roomId = "test-room"; // You can make this dynamic

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && otherPeerIdRef.current) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          to: otherPeerIdRef.current,
          candidate: event.candidate
        }));
      }
    };

    // Add local stream if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, []);

  const createOffer = useCallback(async (targetPeerId: string) => {
    if (!pcRef.current) {
      pcRef.current = createPeerConnection();
    }

    otherPeerIdRef.current = targetPeerId;

    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      wsRef.current?.send(JSON.stringify({
        type: "offer",
        to: targetPeerId,
        sdp: offer
      }));
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }, [createPeerConnection]);

  const handleOffer = useCallback(async (fromPeerId: string, sdp: RTCSessionDescriptionInit) => {
    if (!pcRef.current) {
      pcRef.current = createPeerConnection();
    }

    otherPeerIdRef.current = fromPeerId;

    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      wsRef.current?.send(JSON.stringify({
        type: "answer",
        to: fromPeerId,
        sdp: answer
      }));
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }, [createPeerConnection]);

  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    const message: SignalMessage = JSON.parse(event.data);
    console.log("Received message:", message);

    switch (message.type) {
      case "existing-peers":
        console.log("Existing peers:", message.peers);
        // If there are existing peers, create offers to them
        if (message.peers && message.peers.length > 0) {
          for (const peerId of message.peers) {
            await createOffer(peerId);
          }
        }
        break;

      case "new-peer":
        console.log("New peer joined:", message.clientId);
        // Don't create offer immediately, let the new peer create offers to existing peers
        break;

      case "offer":
        if (message.from && message.sdp) {
          await handleOffer(message.from, message.sdp);
        }
        break;

      case "answer":
        if (message.from && message.sdp) {
          await handleAnswer(message.sdp);
        }
        break;

      case "ice-candidate":
        if (message.candidate) {
          await handleIceCandidate(message.candidate);
        }
        break;

      case "peer-left":
        console.log("Peer left:", message.clientId);
        // Handle peer disconnection
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  }, [createOffer, handleOffer]);

 
  const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
    if (pcRef.current) {
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  };

  const startCall = async () => {
    try {
      // 1. Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Connect to WebSocket server
      wsRef.current = new WebSocket("wss://zoombackend-5nt9.onrender.com");

      wsRef.current.onopen = () => {
        console.log("Connected to WebSocket server");
        setIsConnected(true);
        
        // Join the room
        wsRef.current?.send(JSON.stringify({
          type: "join",
          roomId: roomId,
          clientId: clientId.current
        }));
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        setIsInCall(false);
      };

      setIsInCall(true);
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setIsInCall(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold bg-amber-600">WebRTC Video Call</h1>
      
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg">Local Video</h3>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="border w-64 h-48 bg-black rounded" 
          />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg">Remote Video</h3>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="border w-64 h-48 bg-black rounded" 
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={startCall}
          disabled={isInCall}
          className="bg-green-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600"
        >
          {isInCall ? "In Call..." : "Start Call"}
        </button>
        
        <button
          onClick={endCall}
          disabled={!isInCall}
          className="bg-red-500 text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600"
        >
          End Call
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Status: {isConnected ? "Connected" : "Disconnected"} | 
        Client ID: {clientId.current} | 
        Room: {roomId}
      </div>
    </div>
  );
}
