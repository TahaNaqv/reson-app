import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function CandidateProfile() {
    const router = useRouter();

    const [isActive, setIsActive] = useState(false);
    const [previewImg, setPreviewImg] = useState('');
    const [candidateEmail, setCandidateEmail] = useState();
    const [formData, setFormData] = useState({
        candidate_first_name: '',
        candidate_last_name: '',
        candidate_profile_image: 'NA',
        candidate_img_key: 'NA',
        candidate_s3_folder: 'NA',
        candidate_dob: '',
        candidate_email_address: '',
        skills: '',
        created_date: new Date(),
        date_updated: new Date(),
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        setFormData({
            ...formData,
            candidate_profile_image: e.target.files[0]
        });
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        formData.candidate_email_address = candidateEmail

        try {
            // Upload form data
            const response = await axios.post('/reson-api/candidate', formData);
            const candidateId = response.data.candidate_id;

            let userProfilePic = '';
            let s3key = '';
            let userFolder = '';

            const file = formData.candidate_profile_image;
            if (file) {
                const fileType = encodeURIComponent(file.type);
                userFolder = `candidate_id_${candidateId}/candidate`;

                const res = await fetch(
                    `/api/upload?file=${file.name}&fileType=${fileType}&folder=${userFolder}`
                );
                const { url, key } = await res.json();

                const upload = await fetch(url, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': fileType }
                });
                if (!upload.ok) {
                    throw new Error('Upload failed');
                }

                userProfilePic = `https://reson-images.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`;
                s3key = key;
            }

            const candidateData = {
                ...formData,
                candidate_img_key: s3key,
                candidate_s3_folder: userFolder,
                candidate_profile_image: userProfilePic
            };

            // Update form data with profile picture details
            if(candidateData) {
                console.log(candidateData)
                await axios.put(`/reson-api/candidate/${candidateId}`, candidateData);
            }

            console.log('Form data submitted successfully');
            toast.success('Form data submitted successfully');
            localStorage.setItem('candidateDetails', JSON.stringify({
                candidateId,
                firstName: formData.candidate_first_name,
                lastName: formData.candidate_last_name,
                candidateEmail: candidateEmail
            }));
            if (candidateId) {
                await router.push('/candidate/energy');
            } else {
                await router.push('/candidate/candidate-profile');
            }
            // Handle success
        } catch (error) {
            console.error('Error submitting form:', error);
            // Handle error
        }
    };
      
    const handlePreview = evt => {
        const [file] = company_logo.files
        setIsActive(true)
        if (file) {
            setPreviewImg(URL.createObjectURL(file))
            // let logoPreview = document.getElementById('logoPreview')
            // logoPreview.src = URL.createObjectURL(file)
            console.log('previewImg', previewImg)
        }
        setFormData({
            ...formData,
            candidate_profile_image: evt.target.files[0]
        });
        console.log(formData)
    }

    useEffect(() => {
        // Retrieve candidate details from localStorage on component mount
        // const storedCandidateDetails = localStorage.getItem('candidateDetails');
        // console.log('local storage', localStorage)
        setCandidateEmail(JSON.parse(localStorage.getItem('candidateDetails')).candidate_email_address);
    }, []); // Run this effect only once on component mount
    

    return(
        <>
                <form className='container' id='editCompanyProfile' onSubmit={handleEditSubmit}>                    
                <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='candidate_first_name'>First Name</label>
                            <input type='text' name='candidate_first_name' value={formData.candidate_first_name} onChange={handleInputChange} required placeholder='Enter your first name'/>
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='candidate_last_name'>Last Name</label>
                            <input type='text' id='candidate_last_name' name='candidate_last_name' value={formData.candidate_last_name} onChange={handleInputChange} required placeholder='Enter your last name'  />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='candidate_dob'>Date of Birth</label>
                            <input type='date' id='candidate_dob' name='candidate_dob' value={formData.candidate_dob} onChange={handleInputChange} required placeholder='Select your Date of Birth'  />

                            {/* Candidate Email */}
                            <input type='hidden' id='candidate_email_address' name='candidate_email_address' />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_logo'>Profile Picture
                                <span className='uploadImgBtn position-relative'>Upload Profile Picture</span>
                            </label>
                            <input type='file' id='company_logo' className='hidden' name='company_logo' accept=".jpg, .jpeg, .png" onChange={handlePreview} />
                            <Image src={`${previewImg ? previewImg : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='}`} id='logoPreview' width={50} height={50} alt="" className={`editCompanyLogo ${isActive ? "" : "hidden"}`} priority={false} />
                        </div>
                        {/* <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_email_address'>Email Address</label>
                            <input type='text' id='company_email_address' name='candidate_email_address' value={formData.candidate_email_address} required onChange={handleInputChange} placeholder='Enter your email address' />
                        </div> */}
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <label htmlFor='company_values'>Enter your skillset</label>
                            <textarea type='text' id='company_values' name='skills' value={formData.skills} onChange={handleInputChange} rows={'4'} placeholder='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    
                    <div className='row mt-5 mb-5'>
                        <div className='col-12 text-center'>
                            <input type='submit' id='submitEditCompanyProfile' className='submit-profile-btn' value={'Submit and Proceed'} />
                        </div>
                    </div>
                </form>
        </>
    );
}
