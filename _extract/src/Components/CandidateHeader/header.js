import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { signOut } from "next-auth/react"

function Header() {
    const router = useRouter();
    // const { data: session, status } = useSession();

    // const user = session.user;
    // console.log('user', user)
  return (
    <>
    <div className="d-flex nav-bg align-items-center justify-content-between">
                <div className="d-flex align-items-center ms-4 nav-div-mobile">
                {/* <input type='hidden' name='logged_in_user' id='logged_in_user' value={user.user_id} /> */}
                    {/* <img src="../images/profileLogo.jpeg" alt="" className="profile-logo" /> */}
                    <p className="m-0 ms-3 profile-heading">
                    <span>
                        Welcome,<b> Guest</b>
                    </span>
                    </p>
                </div>
                <img
                    src="../images/Reson_logo_hor_white 1.svg"
                    alt=""
                    className="nav-logo my-3 nav-div-mobile"
                    width={209}
                />
                <div className="me-4 d-flex nav-buttons nav-div-mobile">
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <img src="../images/Icon_2.svg" alt="" className="nav-icon-img" />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <img src="../images/Icon_3.svg" alt="" className="nav-icon-img" />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <img src="../images/Icon_1.svg" alt="" className="nav-icon-img" />
                    </button>
                    {/* <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0" onClick={() => { signOut( {callbackUrl: '/login', redirect: true}  ) }}>
                    <img src="../images/Icon.svg" alt="" className="nav-icon-img" />
                    </button> */}
                </div>
                </div>
    </>
  )
}

export default Header