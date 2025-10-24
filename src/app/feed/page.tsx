"use client";
//30 total new 
import { useRef, useState, useCallback } from "react";

interface SignalMessage {//only used  in handlewebsocketmsg()
  type: string;//handlewebsocketMsg()
  roomId?: string;//createOffer(),handleAnser(),send to websokcte
  clientId?: string;//sedn to websocket
  to?: string;//createOffer() 
  from?: string;//handleOffer()
  sdp?: RTCSessionDescriptionInit;//while  send createOffer()
  candidate?: RTCIceCandidateInit;//handleIceCandidate()
  peers?: string[];//exisiitng users, before createOffer()
}

export default function Feed() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);//createOffer(),handleOffer(),handleAnswer(),handleIcecandidate()
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const otherPeerIdRef = useRef<string | null>(null);//
  const [isConnected, setIsConnected] = useState(false);//for websocket
  const [isInCall, setIsInCall] = useState(false)//for both vdo on or not 
  const clientId = useRef(Math.random().toString(36).substring(7));
  const roomId = "test-room"; // You can make this dynamic

  //(+5)
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });//get the public ip of your broswer 

//recive  remote / other user2 video 
    pc.ontrack = (event) => {
      console.log("Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

//send your  user1`s  public ip to websocket then to  user2  browser when you  get your ip address 
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && otherPeerIdRef.current) {
        wsRef.current.send(JSON.stringify({//send ip address
          type: "ice-candidate",
          to: otherPeerIdRef.current,
          candidate: event.candidate
        }));
      }
    };

//send your own user1 video 
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
    return pc;
  }, []);

//2.bob created the Offer and internally createPeerConnection(+4) 
  const createOffer = useCallback(async (targetPeerId: string) => {
    if (!pcRef.current) {
      pcRef.current = createPeerConnection();
    }

    otherPeerIdRef.current = targetPeerId;

    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      wsRef.current?.send(JSON.stringify({//sending sdp 
        type: "offer",
        to: targetPeerId,
        sdp: offer
      }));
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }, [createPeerConnection]);

//3.alice handle  offer  and internally  createPeerConnection(+4)
  const handleOffer = useCallback(async (fromPeerId: string, sdp: RTCSessionDescriptionInit) => {
    if (!pcRef.current) {
      pcRef.current = createPeerConnection();
    }

    otherPeerIdRef.current = fromPeerId;

    try {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      wsRef.current?.send(JSON.stringify({//sending sdp 
        type: "answer",
        to: fromPeerId,
        sdp: answer
      }));
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }, [createPeerConnection]);

//(+3)websocketserver sedning text msgs to  browser ( browser<<<=====websocketServer)
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    const message: SignalMessage = JSON.parse(event.data);
    console.log("Received message:", message);

    switch (message.type) {

  
      case "existing-peers"://1.after bob start(),2.bob createOffer(aliceUserId),rtcPeerConnection().createOffer()
        console.log("Existing peers:", message.peers);
        // If there are existing peers, create offers to them
        if (message.peers && message.peers.length > 0) {
          for (const peerId of message.peers) {
            await createOffer(peerId);
          }
        }
        break;

      case "new-peer": //alice got it, when bob does strat()
        console.log("New peer joined:", message.clientId);
        // Don't create offer immediately, let the new peer create offers to existing peers
        break;

      case "offer": //3.after bob createOffer(), 4.alice handleOffer(),rtcPeerconnection().handleOffer()
        if (message.from && message.sdp) {
          await handleOffer(message.from, message.sdp);
        }
        break;

      case "answer"://after alice handleOffer(),5.bob handleAnswer() 
        if (message.from && message.sdp) {
          await handleAnswer(message.sdp);
        }
        break;

      case "ice-candidate"://4.createpeerConnection()
        if (message.candidate) {
          await handleIceCandidate(message.candidate);
        }
        break;

      case "peer-left"://end()
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

//4.after alice handle offer & internally createPeerConnection 
// bob  handle answer(+3)
  const handleAnswer = async (sdp: RTCSessionDescriptionInit) => {
    if (pcRef.current) {
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  };
//5.reciving other guy remote ip 
  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  };
//1.bob call and then alice call (+7) 
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
//6.bob end call(+3)
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
          <h3 className="text-lg">Local Video:-Bob</h3>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="border w-64 h-48 bg-black rounded" 
          />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg">Remote Video:-alice </h3>
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

/*
1.alice start()====send alice id sedn  to websocketserver  in wss save in room:{ }  and send msg that no one here  to  handleWebsocketMsg.tsx
2.alice handlewebsocketMsg.tsx 
3.bob start()====send bob id sedn  to websocketserver  in wss save in room:{ }  and send msg that alice here  to  handleWebsocketMsg.tsx
4.bob handlewebsocketMsg.tsx  sees the alice  and  bob handlewebsocketMsg triggger the createOffer  right ??
5.bob createOffer() internally createRtcPeerConnection()====>it goes bob sedn his sdp and bob ip goes to wsserver.ts then websocketserver.ts  sedn it to alice socket
6.alice handlewebsocketmsg()   sees the offer and sess the  bob sdp and ice  candidate of bob  and triggger the handleoffer.ts which intarnally call createRtcpeerconnection() and sedn alicce sdp and ip to websocketserver() to bob socket
7.bob handlewebspcketmessage()    sees the alice sdp and ip  then call the handleanswer()  basically confirmation getting alice sdp and ip address to the websocketserver
8.alice  handlewebsocketessage() sees  this  ....
so in whole process  handlewebsocketmessgae()  is the guy who  handle all the funtion which we have written right except  start() and end () right so 
createRtcpeerconnection()  is controlled by 
handleOffer()   and createOffer() 
and handleOffer(),createOffer(),handleAnswer(),handleIceCandidate()==>all 4 controllled by handlewebsocketmessage()
and in a in-DIRECT way start()  and end()  controlled the handlewebsocketMessage()  right ??
-------------------------------------------------------------------------------------------
1.handleWebsocketMsg(), 
2.createPeerConnection(), 
3.handleIceCandidate(),
new rtcpeercocnection(iceserver) find out user 1 own   ip address 
pc.onIceCandidate() =send user 1  local  ip address ( local user1 ===>>> remote user 2) 
pc.addTracks()==sedn user1 own  local  vdo stream ( local user1 ===>>> remote user 2) 
pcRef.current.addIceCandidate()===receive user2 other guy  remote  ip address ( local user 1 <<<=== remote user2 )
pc.onTrack()===recive user2 user2 other guy remote vdo stream  ( local user 1 <<<=== remote user 2 )
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------

*/