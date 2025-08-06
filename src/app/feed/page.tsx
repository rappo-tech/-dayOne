'use client'
import Link from "next/link"
import Navbar from "../components/navbar"
export default function Feed() {
    
return (<div>


<Navbar></Navbar>
<Link href={'/create'}>
<button className="bg-red-500">go to capitalize it  </button>
</Link>

</div>)
}