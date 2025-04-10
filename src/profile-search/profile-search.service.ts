import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ProfileSearchDto } from './dto/profile.dto';

export enum ConfidenceCount {
  FULL_NAME = 50,

  COMPANY = 10,
  EMAIL = 10
}
// address total = 30
export enum AddressConfidenceCount {
  CITY = 10,
  ADDRESS = 5,
  STATE = 5,
  COUNTRY = 5,
}

interface PersonData {
  displayName: string,
  location: string,
  companyName: string

}

@Injectable()
export class ProfileSearchService {
  private readonly apiUrl = 'https://api.pipl.com/search/';
  private readonly apiKey = 'your-api-key'; // Replace with your actual API key

  //we will serach using email and name (-> profile link from name data), we will calculate confidence for both email and name, and we can compare it and produce net confidence


  //get email, name and every parameter, first search by email if no confidence then go for name and get confidence and so on...

  //find profile with email

  ///find profile by name

  //find profile by link

  // get person data

  //calculate confidence

  calculateConfidence(profileSearchDto: ProfileSearchDto, person_data: PersonData): number {

    const { name, company, address } = profileSearchDto

    let confidence = 0;
    if (name) {
      const nameParts = name.trim().split(' ');

      if (name === person_data?.displayName) {
        confidence += ConfidenceCount.FULL_NAME
      } else {
        if (nameParts[0] !== "" && person_data.displayName.includes(nameParts[0])) {
          if (nameParts[1] !== "" || nameParts[2] !== "") {
            if (person_data.displayName.includes(nameParts[1]) || person_data.displayName.includes(nameParts[2])) {
              confidence += ConfidenceCount.FULL_NAME
            }
          }
        }
      }
    }

    if (address) {
      if (address?.city !== "") {
        if (person_data?.location !== "" && (person_data?.location.includes(address?.city) || person_data?.location.includes(address?.city + ','))) {
          confidence += AddressConfidenceCount.CITY
        }
      }


      if (address?.state !== "") {
        if (person_data?.location !== "" && (person_data?.location.includes(address?.state) || person_data?.location.includes(address?.state + ','))) {
          confidence += AddressConfidenceCount.STATE
        }
      }

      if (address?.country !== "") {
        if (person_data?.location !== "" && (person_data?.location.includes(address?.country) || person_data?.location.includes(address?.country + ','))) {
          confidence += AddressConfidenceCount.COUNTRY
        }
      }

      if (address?.address1 !== "" || address?.address2 !== "") {
        if (person_data?.location !== "" && (person_data?.location.includes(`${address?.address1}`) || person_data?.location.includes(`${address?.address2}`) || person_data?.location.includes(`${address?.address2}` + ',') || person_data?.location.includes(`${address?.address2}` + ','))) {
          confidence += AddressConfidenceCount.ADDRESS
        }
      }
    }

    if (company) {
      if (person_data?.companyName.includes(company)) {
        confidence += ConfidenceCount.COMPANY
      }
    }

    return confidence;
  }

  async getLinkedProfile(profileSearchDto: ProfileSearchDto) {
    let confidence_on_email = 0;
    let confidence_on_name = 0;
    let confidence_on_link = 0;
    try {

      if (profileSearchDto.email) {
        const options = {
          method: 'POST',
          url: 'https://linkedin-data-scraper.p.rapidapi.com/email_to_linkedin_profile',
          headers: {
            'x-rapidapi-key': 'bcfab707b6msh3b13e094ad1bf26p19071ajsn41f8ae0ee227',
            'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
            'Content-Type': 'application/json'
          },
          data: {
            email: profileSearchDto.email
          }
        };

        try {
          const response = await axios.request(options);
          if (response?.data?.success) {

            const displayName: string = `${response?.data?.person_data?.displayName}`
            const companyName: string = `${response?.data?.person_data?.companyName}`
            const location: string = `${response?.data?.person_data?.location}`

            const personData: PersonData = {
              displayName,
              companyName,
              location
            }
            
            confidence_on_email = this.calculateConfidence(profileSearchDto, personData)
          }

          console.log(response.data);
        } catch (error) {
          console.error(error);
        }
      }


    } catch (error) {
      console.log("error", error)
      throw new HttpException(error?.message || "An Error Occured", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  // find linked based on email, google the person on linked in details, find insta, tiktok, etc...

  // async findLinkedProfile(name: string, email: string, city: string, state: string) {
  async findLinkedProfile() {
    const name = "Muqeet Ahmad";
    const email = "engrmuqeetahmad@gmail.com";
    const city = "Multan";
    const state = "Punjab";
    const nameParts = name.trim().split(' ');


    const options = {
      method: 'POST',
      url: 'https://mtn-email-to-linkedin-lookup-api.p.rapidapi.com/api/email-to-linkedin',
      headers: {
        'x-rapidapi-key': '50c23a771dmsh5a551b9a3529d2bp1aa0bdjsn834acd34db7d',
        'x-rapidapi-host': 'mtn-email-to-linkedin-lookup-api.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: {
        email: 'engrmuqeetahmad@gmail.com'
      }
    };

    try {
      const response = await axios.request(options);
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }

  }
}
