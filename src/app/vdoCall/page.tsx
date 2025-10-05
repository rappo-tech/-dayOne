'use client'

import { useState,useRef, useCallback } from "react"

interface MsgFromwebSocket{
type:string, 
peers?: string[],
to?:string, 
clientId?:string, 
roomId?:string,
sdp?:RTCSessionDescriptionInit, 
candidate?:RTCIceCandidateInit, 
from?:string,
}
 export  default  function VdoCall() {

const [isVdoOn,setIsVdo]=useState<boolean>(false)
const [isWsOn,setIsWsOn]=useState<boolean>(false)
const pcRef=useRef<RTCPeerConnection|null>(null)
const wsRef=useRef<WebSocket|null>(null)
const clientId=useRef(Math.random().toString(36).substring(7));
const othersPeerId=useRef<string>('')
const roomId='test_rooms'
const remoteVdo=useRef<HTMLVideoElement|null>(null)
const localVdo=useRef<HTMLVideoElement|null>(null)
const vdoStream=useRef<MediaStream|null>(null)


const createPeerConnection=useCallback(()=>{
const pc= new RTCPeerConnection({
iceServers:[{urls:"stun:stun.l.google.com:19302" }]
})     

//send local vdo 
if(vdoStream.current){
vdoStream.current.getTracks().forEach((x)=>{
pc.addTrack(x,vdoStream.current!)
})
}
//recive remote vdo
pc.ontrack=(event)=>{
if(remoteVdo.current){
remoteVdo.current.srcObject=event.streams[0]
}
}
//send your ip/icecandidate
pc.onicecandidate=(event)=>{
if(wsRef.current && event.candidate && othersPeerId.current){
wsRef.current.send(JSON.stringify({
type:"ice-candidate",
to:othersPeerId.current, 
candidate:event.candidate
}))
}
}

return pc 
},[])

const end=()=>{

if(pcRef.current){
pcRef.current.close()
pcRef.current=null
}
if(wsRef.current){
wsRef.current.close()
wsRef.current=null
}
if(vdoStream.current){
vdoStream.current.getTracks().forEach((x)=>x.stop())
vdoStream.current=null
}
if(localVdo.current){
localVdo.current.srcObject=null
}
if(remoteVdo.current){
remoteVdo.current.srcObject=null
}
setIsVdo(false)
setIsWsOn(false)

}

const handleAnswer=(async(sdp:RTCSessionDescriptionInit)=>{
if(pcRef.current){
await pcRef.current.setRemoteDescription( new RTCSessionDescription(sdp))
}
})

const handleOffer=useCallback(async(from:string,sdp:RTCSessionDescriptionInit)=>{
if(!pcRef.current){
pcRef.current=createPeerConnection()
}
othersPeerId.current=from

await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
const answersdp=await pcRef.current.createAnswer()
await pcRef.current.setLocalDescription(answersdp)
wsRef.current?.send(JSON.stringify({
type:"answer",
to:from,
sdp:answersdp
}))


},[createPeerConnection])

const handleIceCandidate=(async(candidate:RTCIceCandidateInit)=>{
if(pcRef.current){
await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
}
})


const createOffer=useCallback(async(targetId:string)=>{
if(!pcRef.current){
pcRef.current=createPeerConnection()
}
othersPeerId.current=targetId
const offer=await pcRef.current.createOffer()
await pcRef.current.setLocalDescription(offer)
wsRef.current?.send(JSON.stringify({
type:'offer', 
to:targetId, 
sdp:offer
}))




},[createPeerConnection])


const handleWebMsg=useCallback(async(event:MessageEvent)=>{
const messageEvent :MsgFromwebSocket   =JSON.parse(event.data)
switch (messageEvent.type) {

    case 'existing-peers':
console.log(`existing peer apeared ${messageEvent.peers}`)
if(messageEvent.peers && messageEvent.peers.length>0){
for(const peerId  of messageEvent.peers){
await createOffer(peerId)
}
}
        break;
case 'new-peer':
console.log(`new peerId has came ${clientId}`)
break;

case 'offer':
if(messageEvent.from &&  messageEvent.sdp){
await handleOffer(messageEvent.from,messageEvent.sdp)
}
break;

case 'answer':
if(messageEvent.from && messageEvent.sdp){
await handleAnswer(messageEvent.sdp)
}
break;

case 'ice-candidate':
if(messageEvent.candidate){
await handleIceCandidate(messageEvent.candidate)
}
break;

case 'peer-left':
console.log(`this user  has left ${clientId}`)
  if (remoteVdo.current) {
          remoteVdo.current.srcObject = null;
        }
break;



    default:
        break;
}


},[createOffer,handleOffer])


const start =async()=>{
const camera = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
vdoStream.current=camera
if(localVdo.current){
localVdo.current.srcObject=camera
}
wsRef.current= new WebSocket("wss://zoombackend-5nt9.onrender.com")
wsRef.current.onopen=()=>{
setIsWsOn(true)
wsRef.current?.send(
JSON.stringify({
type:"join", 
clientId:clientId.current, 
roomId
})
)
}
wsRef.current.onmessage=handleWebMsg;
wsRef.current.onerror=()=>{console.log('error while connecting to  websocket ')}
wsRef.current.onclose=()=>{
setIsVdo(false)
setIsWsOn(false)
}
setIsVdo(true)
}


return(<div>



<p>{isWsOn?"websocket on  ":" websocket off "}</p>
<button onClick={start} className="bg-green-600 hover:bg-green-400">start </button>


<p>------------remote vdo---------------- </p>
<video
ref={remoteVdo}
className="w-48 h-36 border-4"
autoPlay
playsInline
muted
controls
></video>


<p>------------local vdo----------------</p>
<video
ref={localVdo}
className="w-48 h-36 border-4"
autoPlay
playsInline
muted
controls
></video>

<button onClick={end} className="bg-red-500 hover:bg-red-400">end call </button>




<p>{isVdoOn?' connected vdo  ':" disconnected vdo "}</p>
<p>clinet Id: {clientId.current}</p>
<p> room id: {roomId}</p>
</div>)
 }
