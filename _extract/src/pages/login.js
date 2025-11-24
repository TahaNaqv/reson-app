// pages/login.js
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import { validateEmail } from "@/utils";
import Image from 'next/image';
import Link from 'next/link';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageLoader from '@/Components/Loader/pageloader';
import { register } from 'swiper/element/bundle';

export default function LoginPage() {
  const router = useRouter();
  const { status, data: session } = useSession()
  register();

  if(status === 'authenticated') {
        router.push('/company/create-profile');
        return
      }
      if (status === "loading") {
        return <PageLoader />
      }

  const handleLogin = async (event) => {
    event.preventDefault()

        const email = event.target.email.value;
        const password = event.target.password.value;

        if( email == null || email== '' || !validateEmail(email)) {
            toast.error('Invalid email address', { theme: 'colored' });
            return;
        }

        if( password == null || password == '' ) {
            toast.error('Invalid password', { theme: 'colored' });
            return;
        }
    const submitForm = event.target.submit;
        submitForm.innerText = 'Please wait...';
    const result = await signIn('credentials', {
      email: email,
      password: password,
      callbackUrl: '/company/dashboard',
      redirect: false
    }).then(({ok, error}) => {
      if(ok) {
          toast.success('User authenticated successfully')
      }
      else {
          toast.error('Invalid username or password', {theme: 'colored'})
          submitForm.innerText = 'Sign In';
      }
  });
  };

  return (
    <>
    {/* New CODE */}
    <div className="row">
      {/* Left Pannel*/}
      <div className="col-lg-5 d-flex align-items-center justify-content-center sign-in-left-pannel-container ">
        {/* Header Logo*/}
        <div className="col">
          <div className="row mb-4">
            <div className="col text-center">
              <Image src={'/images/reson_Logo.svg'} alt='Reson' width={200} height={37} className="header-logo" />
              <h3 className="signup-subheading">Welcome Back!</h3>
              <p className="signup-info">
                Please enter your details to proceed with the platform
              </p>
            </div>
          </div>
          {/* Form */}
          <div className="login-form">
            {/* main form */}
            <form onSubmit={handleLogin}>
              <label htmlFor="InputEmail">Email</label>
              <div className="single-input">
                <span>
                  <Image src={'/images/email.svg'} alt='email' className='emailIcon' width={41} height={38} />
                </span>
                <input
                  type="email"
                  id="InputEmail"
                  name="email"
                  placeholder="Enter your email"
                />
              </div>
              <label htmlFor="InputPassword">Password</label>
              <div className="single-input">
                <span>
                <Image src={'/images/password.svg'} alt='password' className='emailIcon' width={39} height={40} />
                </span>
                <input
                  type="password"
                  id="InputPassword"
                  name="password"
                  placeholder="***************"
                />
              </div>
              <div className="form-group form-check">
                {/* <input
                  type="checkbox"
                  className="form-check-input"
                  id="remembercheck"
                />
                <label className="form-check-label" htmlFor="remembercheck">
                  Remember for 30 days
                </label> */}
                <Link href={'/#'} className="forgot-password" >Forgot Password</Link>
              </div>
              <div className="single-input submit-btn">
                <input type="submit" value={'Sign In'} />
              </div>
            </form>
          </div>
          <div className="d-flex justify-content-center">
            <span className="noaccount">
              {`Don't have an account?`} &nbsp;
              <Link href={'/register'} className="signup-link">Sign up</Link>
            </span>
          </div>
        </div>
      </div>
      {/* Right Pannel */}
      <div className="col-lg-7 d-flex align-items-center  sign-in-right-pannel-container">
        <div className="sign-in-inner text-center">
          <Image src={'/images/reson_mask-circle-big.svg'} alt='Elements' className="element-right-img" width={287} height={324} />
          <Image src={'/images/reson_mask_element_left.svg'} alt='Elements' className="element-left-img" width={64} height={90} />
          <swiper-container navigation="true" autoplay="true" delay="9000">
            <swiper-slide>
              <div className='marketing-swiper-content'>
                <Image src={'/images/reson-group-of-people.png'} alt='Group of people' className="sign-in-inner-banner" width={539} height={400} />
                {/*- Swipper*/}
                {/* <Image src={'/images/quote.svg'} alt='Quote' className="sign-in-quote" width={17} height={13} /> */}
                <p className="marketing-headline">
                Turning your gut feeling into a soft skill fit-score
                </p>
                <p className="marketing-subhead">Find the best talent match for your team through measurable indicators for your role and team culture</p>
              </div>
            </swiper-slide>

            <swiper-slide>
              <div className='marketing-swiper-content'>
                <Image src={'/images/slide2.jpeg'} alt='Group of people' className="sign-in-inner-banner slide-images" width={539} height={400} />
                {/*- Swipper*/}
                {/* <Image src={'/images/quote.svg'} alt='Quote' className="sign-in-quote" width={17} height={13} /> */}
                <p className="marketing-headline">
                Create your company profile once and benefits multiple times
                </p>
                <ul className="marketing-subhead text-left">
                  <li>One Company profile</li>
                  <li>Many Job descriptions</li>
                  <li>Unlimited candidate applications</li>
                  <li>The best matches for your role and team</li>
                </ul>
              </div>
            </swiper-slide>

            <swiper-slide>
              <div className='marketing-swiper-content'>
                <Image src={'/images/slide4.jpeg'} alt='Group of people' className="sign-in-inner-banner slide-images" width={539} height={400} />
                {/*- Swipper*/}
                {/* <Image src={'/images/quote.svg'} alt='Quote' className="sign-in-quote" width={17} height={13} /> */}
                <p className="marketing-headline">
                Communicate with your candidates as if you are in the same room
                </p>
                <p className="marketing-subhead">Asynchronous video assessment create a more personal connection with candidates.</p>
              </div>
            </swiper-slide>

            <swiper-slide>
              <div className='marketing-swiper-content'>
                <Image src={'/images/slide3.jpeg'} alt='Group of people' className="sign-in-inner-banner slide-images" width={539} height={400} />
                {/*- Swipper*/}
                {/* <Image src={'/images/quote.svg'} alt='Quote' className="sign-in-quote" width={17} height={13} /> */}
                <p className="marketing-headline">
                AI-supported analyses that helps you make confident decisions
                </p>
                <p className="marketing-subhead">Saves your precious time and your team's energy</p>
              </div>
            </swiper-slide>
          </swiper-container>
        </div>
      </div>
    </div>
    
    </>
    
  );
}