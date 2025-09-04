export  default function  Button() {
    

return (<div>
    <button  onClick={()=>{
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  } else {
    alert("Vibration not supported on this device");
     }} }   className="bg-teal-600 hover:bg-teal-400 w-full     block sm:w-1/2 md:w-1/3 lg:w-1/4 mx-auto my-6 p-3 " >capitalize it !!! </button>
</div>)

}