import { React, useState, useRef, useEffect } from 'react';

function Timer(timer) {

    const [counter, setCounter] = useState(parseInt(timer.time));

    useEffect(() => {
      const countdownTimer = counter > 0 && setInterval(() => setCounter(counter - 1), 1000);
      return () => clearInterval(timer);
    }, [counter])
    

    return (
        <>
        <div className='countdown'>
            {counter}
        </div>
        </>
    )
}

export default Timer