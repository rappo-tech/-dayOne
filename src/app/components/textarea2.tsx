'use client'
export default function  TextArea2() {
    
return (<div>

<textarea
placeholder="write anything..... "
  className="
    w-full border-2 border-amber-500 rounded-lg
    h-40        /* Default mobile height */
    sm:h-56     /* Small tablets */
    md:h-72     /* Medium tablets */
    lg:h-96     /* Large screens */
    p-3
    text-base
  "

></textarea>




</div>)
}