import React, {useState} from "react"
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { validateEmail } from "@/utils";
import ReactPasswordChecklist from "@/Components/ReactPasswordChecklist"
import 'bootstrap/dist/css/bootstrap.min.css';
import { register } from 'swiper/element/bundle';

export default function RegisterPage() {
  const router = useRouter();
  const { status, data: session } = useSession()
  register();

  const [password, setPassword] = useState("")
	const [passwordAgain, setPasswordAgain] = useState("")

  const handleRegister = async (event) => {
    event.preventDefault()

        const name = event.target.fullName.value;
        const email = event.target.email.value;
        const password = event.target.password.value;
        const confirmPassword = event.target.confirmPassword.value;

        if( name == null || name == '' ) {
          toast.error('Please enter full name', { theme: 'colored' });
          return;
        }

        if( email == null || email== '' || !validateEmail(email)) {
            toast.error('Invalid email address', { theme: 'colored' });
            return;
        }

        if( password == null || password == '' ) {
            toast.error('Invalid password', { theme: 'colored' });
            return;
        }

        if( confirmPassword == null || confirmPassword == '' || confirmPassword != password ) {
          toast.error('Please ensure that the passwords match', {theme: 'colored'});
          return;
        }
    const submitForm = event.target.submit;
        submitForm.innerText = 'Please wait...';

      try {
        var raw = {
          user_name: name,
          user_email_address: email,
          password: password,
          role: 'recruiter',
        }
        // console.log(raw);
        const response = await axios.post('/reson-api/user_accounts', raw);
console.log(response);
          if(response.status === 201) {
            toast.success('User registered successfully. You will be redirected to Login shortly.', {
              onClose: () => {
                router.push('/login');
              },
            })
          } else {
            toast.error('Error registering new user. Please try again in sometime.', { theme: 'colored' });
          }
      } catch (error) {
        if(error.response.status === 400) {
          toast.error('Email id already exists. Please proceed to login')
          console.clear()
        } else {
          toast.error('Error registering new user. Please try again in sometime.', { theme: 'colored' });
        }
        // console.error(error);
      }
      
        
  };

  return (
    <>
    <div className="row mt-4 mb-4">
      {/* Left Pannel*/}
      <div className="col-lg-5 d-flex align-items-center justify-content-center sign-in-left-pannel-container ">
        {/* Header Logo*/}
        <div className="col">
          <div className="row mb-4">
            <div className="col text-center">
              <Image src={'/images/reson_Logo.svg'} alt='Reson' width={200} height={37} className="header-logo" />
              <h3 className="signup-subheading">Create Account</h3>
              <p className="signup-info">
                Please fill the following details
              </p>
            </div>
          </div>
          {/* Form */}
          <div className="login-form">
            {/* main form */}
            <form onSubmit={handleRegister}>
            <label htmlFor="InputName">Full Name</label>
              <div className="single-input">
                <span className='inlineSpacer'></span>
                <input
                  type="text"
                  id="InputName"
                  name="fullName"
                  placeholder="Enter full name"
                />
              </div>
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
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="single-input">
                <span>
                  <Image src={'/images/password.svg'} alt='password' className='emailIcon' width={39} height={40} />
                </span>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="***************"
                  onChange={e => setPasswordAgain(e.target.value)}
                />
              </div>
              <ReactPasswordChecklist rules={["minLength","number","capital","match"]} minLength={8} value={password} valueAgain={passwordAgain} onChange={(isValid) => {}} iconSize={12} className="validate-password mb-2" />
              {/* <p className='noteText'>Use 8 or more characters with a mix of letters, numbers & symbols</p> */}
              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="tos"
                  required
                />
                <label className="form-check-label" htmlFor="tos">
                By creating an account, I agree to the Terms & Conditions and Privacy Policy
                </label>
              </div>
              <div className="single-input submit-btn">
                <input type="submit" value={'Sign Up'} />
              </div>
            </form>
          </div>
          <div className="d-flex justify-content-center">
            <span className="noaccount">
              Already have an account? &nbsp;
              <Link href={'/login'} className="signup-link">Sign In</Link>
            </span>
          </div>
        </div>
      </div>
      {/* Right Pannel */}
      <div className="col-lg-7 d-flex align-items-center  sign-in-right-pannel-container">
        <div className="sign-in-inner text-center">
          <Image src={'/images/reson_mask-circle-big.svg'} alt='Elements' className="element-right-img" width={160} height={180} />
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