import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { signOut } from "next-auth/react"
import Image from 'next/image';
import Link from 'next/link'

function HeaderBar() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const user = session.user;
  return (
    <>
    <div className="d-flex nav-bg align-items-center justify-content-between">
                <div className="d-flex align-items-center ms-4 nav-div-mobile">
                <input type='hidden' name='logged_in_user' id='logged_in_user' value={user.user_id} />
                    {/* <img src="../images/profileLogo.jpeg" alt="" className="profile-logo" /> */}
                    <p className="m-0 ms-3 profile-heading">
                    <span>
                        Welcome,<b> {user.user_name}</b>
                    </span>
                    </p>
                </div>
                <Link href={'/company/dashboard'}>
                    <Image src={'/images/Reson_logo_hor_white 1.svg'} alt={'Reson'} className={'nav-logo my-3 nav-div-mobile'} width={'209'} height={'38'} />
                </Link>
                <div className="me-4 d-flex nav-buttons nav-div-mobile">
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <Image src={"/images/Icon_2.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                    <Image src={"/images/Icon_3.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                    <Link href='/company/dashboard' className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0">
                        <Image src={"/images/Icon_1.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </Link>
                    <button className="nav-icon d-flex justify-content-center align-items-center mx-2 border-0" onClick={() => { signOut( {callbackUrl: '/login', redirect: true}  ) }}>
                    <Image src={"/images/Icon.svg"} alt={""} className={"nav-icon-img"} width={'40'} height={'40'} />
                    </button>
                </div>
                </div>
    </>
  )
}

export default HeaderBar