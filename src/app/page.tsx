'use client'


import Link from "next/link"
import Navbar from "./components/navbar"

export  default function  Home() {


return (<div>

<Navbar></Navbar>
<Link href={'/create'}>
<button className="bg-teal-600 hover:bg-teal-400 w-full     block sm:w-1/2 md:w-1/3 lg:w-1/4 mx-auto my-36 p-3 " >capitalize it !!! </button>
</Link>

</div>)
  



}