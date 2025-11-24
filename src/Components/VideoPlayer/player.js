import { useCallback, useEffect, useState } from "react";
import videojs from "video.js";
import 'video.js/dist/video-js.css';

export default function VideoPlayer(props) {
    // console.log(props);
    const [videoEl, setVideoEl] = useState(null);
    const onVideo = useCallback((el) => {
        setVideoEl(el);
    }, []);

    useEffect(() => {
        if (videoEl == null) {
          return;
        }
    
        // our video.js player
        const player = videojs(videoEl, props);

        // if(props.modal && props.modal === true) {
        //     player.on('play', function() {
        //         var modal = player.createModal(videojs(videoEl, props));
        //         modal.addClass('fullscreen-modal');

        //         // When the modal closes, resume playback.
        //         // modal.on('modalclose', function() {
        //         //     player.stop();
        //         // });
        //     })
        // }
    
        return () => {
        //   player.dispose();
        };
      }, [props, videoEl]);

    return (
    <>
        <div data-vjs-player>
            <video ref={onVideo} className="video-js recorded" playsInline />
        </div>
    </>
    );
}