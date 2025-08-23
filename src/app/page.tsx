'use client'

import Link from "next/link"
import Navbar from "./components/navbar"
import Button from "./components/button"
import Flexbox from "./components/flexbox"

export  default function  Home() {


return (<div>


<Navbar></Navbar>

<Link href={'/create'}>
<Button></Button>
</Link>

<Link href={'https://medium.com/@anuragdnd456/13august2025-fullstack-9e89202de1cd'}>
<button  className="bg-amber-500 hover:bg-amber-400 px-4 py-4      my-6 block mx-auto ">tech stack</button>
</Link>

<Flexbox></Flexbox>


</div>)
  



}