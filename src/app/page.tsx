'use client'

import Link from "next/link"
import Navbar from "./components/navbar"
import Button from "./components/button"

export  default function  Home() {


return (<div>

<Navbar></Navbar>
<Link href={'/create'}>
<Button></Button>
</Link>

</div>)
  



}