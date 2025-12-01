import { React, useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import Link from 'next/link';

export default function EditCompanyProfile() {
    const { data: session, status } = useSession({
      required: true,
      onUnauthenticated() {
        // The user is not authenticated, handle it here.
          router.push('/login');
      },
    });

    const [companyData, setCompanyData] = useState('');
    const [s3FileUrl, setS3FileUrl] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [previewImg, setPreviewImg] = useState('');
    const logoImgRef = useRef(null);

    const fetchCompanyData = async () => {
        try {
            const user_id = session.user.user_id;
            const response = await axios.get('/reson-api/company/user/' + user_id);
            // console.log(response.data)
            setCompanyData(response.data);

            const s3key = response.data.company_logo_key;
            const s3folder = response.data.company_s3folder;

            const res2 = await fetch(
                `/api/download?file=${s3key}&key=${s3key}&folder=${s3folder}`
            )

            const { durl, dkey } = await res2.json()

            setS3FileUrl(durl);
            // console.log(s3FileUrl);
            
        } catch (error) {
            console.error('Error fetching company id: ', error.message);
        }
    }


    useEffect(() => {
        if(session){
            if(session.user.company_id != 0) {
                fetchCompanyData()
            } else {
                router.push('/company/create-profile')
            }
        }
    }, [session])

    // Set src directly on img element to bypass React's HTML encoding
    useEffect(() => {
        if (s3FileUrl && logoImgRef.current) {
            logoImgRef.current.src = s3FileUrl;
        }
    }, [s3FileUrl]) 

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        // console.log(event.target);
        document.getElementById('submitEditCompanyProfile').value = 'Please wait...'
        var formData = new FormData(event.target)
        const file = formData.get('company_logo');
        const filename = file.name
        let userProfilePic = companyData.company_logo
        let s3key = companyData.company_logo_key
        
        if(filename) {
            // Upload the files to S3 bucket
            const fileType = encodeURIComponent(file.type)
            const userFolder = 'user_id_' + formData.get('user_id') + '/company'

            const res = await fetch(
                `/api/upload?file=${filename}&fileType=${fileType}&folder=${userFolder}`
            )
            const { url, key } = await res.json()

            // console.log(url)

            const upload = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { "Content-Type": fileType }
            })
            if (upload.ok) {
                toast.success('Company Logo uploaded successfully')
            } else {
                toast.error('Company Logo upload failed. Please try again later')
                return false
            }

            userProfilePic = `https://reson-assets.s3.eu-central-1.amazonaws.com/${userFolder}/${key}`
            s3key = key
        }

        try {
            var raw = {
                "user_id": formData.get('user_id'),
                "company_id": formData.get('company_id'),
                "company_name": formData.get('company_name'),
                "company_website": formData.get('company_website'),
                "company_email_address": formData.get('company_email_address'),
                "company_logo": userProfilePic,
                "company_logo_key": s3key,
                "company_s3folder": 'user_id_' + formData.get('user_id') + '/company',
                "company_ceo_video_url": null,
                "company_ceo_video_key": null,
                "company_description": '',
                "company_team_size": formData.get('company_team_size'),
                "company_stage": formData.get('company_stage'),
                "company_address": formData.get('company_address'),
                "company_country": formData.get('company_country'),
                "company_values": formData.get('company_values'),
                "company_working_environment": formData.get('company_working_environment'),
                "company_growth": formData.get('company_growth'),
                "company_diversity": formData.get('company_diversity'),
                "company_vision": formData.get('company_vision'),
                "created_date": new Date(),
                "last_modified_date": new Date()
            }
            // console.log('raw', raw)

            const response = await axios.put(`/reson-api/company/${formData.get('company_id')}`, raw);
            if(response.status === 200) {
                toast.success('Company profile updated successfully');
                document.getElementById('submitEditCompanyProfile').value = 'Update and save'
            }
        } catch (error) {
            document.getElementById('submitEditCompanyProfile').value = 'Update and save'
        }


    }

    const handlePreview = evt => {
        const [file] = company_logo.files
        setIsActive(true)
        if (file) {
            setPreviewImg(URL.createObjectURL(file))
            // let logoPreview = document.getElementById('logoPreview')
            // logoPreview.src = URL.createObjectURL(file)
            console.log('previewImg', previewImg)
        }
    }
      

    return(
        <>
            {companyData && (
                <form className='container' id='editCompanyProfile' onSubmit={handleEditSubmit}>
                    <input type='hidden' name='user_id' value={session.user.user_id} />
                    <input type='hidden' name='company_id' value={session.user.company_id} />
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_name'>Company Name</label>
                            <input type='text' id='company_name' name='company_name' placeholder='Enter Company Name' defaultValue={companyData.company_name} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5 position-relative'>
                            <label htmlFor='company_logo'>Company Logo
                            <span className='uploadImgBtn position-relative'>Upload new logo</span>
                            </label>
                            <input type='file' id='company_logo' className='hidden' name='company_logo' accept=".jpg, .jpeg, .png" onChange={handlePreview} />
                            {s3FileUrl && (
                                <img 
                                    ref={logoImgRef}
                                    width={50} 
                                    height={50} 
                                    alt="Company Logo" 
                                    className={`editCompanyLogo ${isActive ? "hidden" : ""}`} 
                                    id='s3CompanyLogo'
                                    onError={(e) => {
                                        console.error('Image failed to load. URL:', s3FileUrl);
                                    }}
                                />
                            )}
                            <Image src={`${previewImg ? previewImg : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='}`} id='logoPreview' width={50} height={50} alt="" className={`editCompanyLogo ${isActive ? "" : "hidden"}`} priority={false} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_address'>Company Address</label>
                            <input type='text' id='company_address' name='company_address' placeholder='Where are you located' defaultValue={companyData.company_address} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_country'>Company Country</label>
                            <input type='text' id='company_country' name='company_country' placeholder='Headquarters Country' defaultValue={companyData.company_country} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_team_size'>Number of employees</label>
                            <input type='text' id='company_team_size' name='company_team_size' placeholder='200+' defaultValue={companyData.company_team_size} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_stage'>Company Stage</label>
                            <input type='text' id='company_stage' name='company_stage' placeholder='200+' defaultValue={companyData.company_stage} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-8'>
                            <label htmlFor='company_values'>Company Values & Culture</label>
                            <textarea type='text' id='company_values' name='company_values' rows={'4'} placeholder='What are the top three core values of your organization, and how are they reflected in the day-to-day operations and decisions' defaultValue={companyData.company_values} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_working_environment'>Working Environment</label>
                            <textarea type='text' id='company_working_environment' name='company_working_environment' rows={'4'} placeholder='How would you describe the working environment and style of collaboration in your company (e.g., team-oriented, independent, flexible)?' defaultValue={companyData.company_working_environment} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_growth'>Growth and Development Opportunities</label>
                            <textarea type='text' id='company_growth' name='company_growth' rows={'4'} placeholder='What opportunities does your company offer for professional growth and development, such as training programs, mentorship, or career advancement?' defaultValue={companyData.company_growth} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_diversity'>Diversity and Inclusion</label>
                            <textarea type='text' id='company_diversity' name='company_diversity' rows={'4'} placeholder='How does your organization implement diversity and inclusion in its workforce, and what initiatives or policies are in place to support this?' defaultValue={companyData.company_diversity} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_vision'>Future Vision and Goals</label>
                            <textarea type='text' id='company_vision' name='company_vision' rows={'4'} placeholder="What are the key goals and vision for the company's future, especially regarding growth, innovation, and market presence?" defaultValue={companyData.company_vision} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mb-5'>
                        <div className='col-12 col-sm-2'></div>
                        <div className='col-12 col-sm-4 pe-5'>
                            <label htmlFor='company_email_address'>Company Email Address</label>
                            <input type='text' id='company_email_address' name='company_email_address' placeholder='Enter Company Name' defaultValue={companyData.company_email_address} />
                        </div>
                        <div className='col-12 col-sm-4 ps-5'>
                            <label htmlFor='company_website'>Company Website</label>
                            <input type='text' id='company_website' name='company_website' placeholder='Enter Company Name' defaultValue={companyData.company_website} />
                        </div>
                        <div className='col-12 col-sm-2'></div>
                    </div>
                    <div className='row mt-5 mb-5 align-items-center'>
                        <div className='col-12 col-sm-6 text-end'>
                            <input type='submit' id='submitEditCompanyProfile' className='submit-profile-btn' value={'Update and Save'} />
                        </div>
                        <div className='col-12 col-sm-6'>
                            <Link href={'/company/company-profile'} className='profile-btn'>View Company Profile</Link>
                        </div>
                    </div>
                </form>
            )}
        </>
    );
}