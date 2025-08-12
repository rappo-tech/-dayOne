'use client'

import { FormEvent, useCallback, useState } from "react"
import Link from "next/link"
import Navbar from "../components/navbar"

export  default function  Create() {
  const[arr,setArr]=useState<string[]>([])
  const[name,setName]=useState<string>('')
  const[status,setStatus]=useState<string>('')


const  saveName=useCallback((e:FormEvent<HTMLFormElement>)=>{
e.preventDefault()
try{
setArr((pre)=>[...pre,name])
setName('')
}catch{
setStatus('internal error')
}
},[name])

  
return (<div>

<Navbar></Navbar>
<p className="bg-green-400">put your name here and see it  in capital letter   </p>

<form onSubmit={saveName}>
  <input
  type="text"
  placeholder="enter your name ... "
  value={name}
  onChange={(e)=>setName(e.target.value)}
  />

<button className="bg-red-600" type='submit'  >save</button>

</form>

<Link href={'/feed'}>
<button className="bg-yellow-300 hover:bg-amber-400" >go to join  ws  </button>
</Link>


<p>status:{status}</p>

<div className="bg-pink-500">{
arr.map((elemnt,index)=>{
return <div key={index}>
<p>{elemnt.toUpperCase()}</p>
</div>
})
  }</div>

</div>)
}