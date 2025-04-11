import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ProfileSearchDto } from './dto/profile.dto';
import { StateEnum } from 'src/utils/states.enum';
import { CountryEnum } from 'src/utils/coutries.enum';

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
  companyName: string,
  link?: string
}

interface ResultCompare {
  confidence: number,
  linkedInURL: string
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
    console.log("profile Data", profileSearchDto)
    let email_linked_data: ResultCompare;

    let name_linked_data: ResultCompare[] = [] //confidence, url, 

    let url_linked_data: ResultCompare[] = [] //confidence, url
    //for url email: linkedInUrl, || name: navigationUrl,
    //for company: email: positions.positionHistory[].company.companyName, ||   name: no company,  || link: experiences[].title, experiences[].subtitle
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

          let companyName: string = `${response?.data?.person_data?.companyName}, `
          companyName = companyName + response?.data?.person_data?.positions?.positionHistory?.map((position: any) => position?.company?.companyName).join(', ')


          const displayName: string = `${response?.data?.person_data?.displayName}`

          const location: string = `${response?.data?.person_data?.location}`
          const link: string = `${response?.data?.linkedinUrl}`

          const personData: PersonData = {
            displayName,
            companyName,
            location,
          }

          const data: any = this.calculateConfidence(profileSearchDto, personData)

          email_linked_data = {
            confidence: data,
            linkedInURL: link
          }
          console.log("Email:", email_linked_data);
        }

        setTimeout(() => {
          console.log("Link item");
        }, 1 * 1000); // delay increases with index
      } catch (error) {
        setTimeout(() => {
          console.log("Link item");
        }, 1 * 1000); // delay increases with index
        console.error(error.message);
      }
    }
    console.log("came here")
    if (profileSearchDto.name) {
      console.log("camer here 1")
      const options = {
        method: 'POST',
        url: 'https://linkedin-data-scraper.p.rapidapi.com/search_person',
        headers: {
          'x-rapidapi-key': 'bcfab707b6msh3b13e094ad1bf26p19071ajsn41f8ae0ee227',
          'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        data: {
          keywords: `${profileSearchDto.name}`,
          // keywords: `${profileSearchDto.name}, ${profileSearchDto.company}, ${profileSearchDto.address?.city}, ${StateEnum[`${profileSearchDto.address?.state}`] !== "" ? StateEnum[`${profileSearchDto.address?.state}`] : `${profileSearchDto.address?.state}`}, ${CountryEnum[`${profileSearchDto.address?.country}`] !== "" ? CountryEnum[`${profileSearchDto.address?.country}`] : `${profileSearchDto.address?.country}`}`,
          geoUrns: '',
          count: 10
        }
      };

      try {

        const response = await axios.request(options);
        if (response?.data?.success) {


          response?.data?.response?.forEach((person_data: any) => {
            const displayName: string = `${person_data?.fullName}`
            const companyName: string = `${person_data?.primarySubtitle}`
            const location: string = `${person_data?.secondarySubtitle}`

            const navigateURL = person_data?.navigationUrl.trim() || ""
            const indexOfQueryStart = navigateURL.indexOf('?')

            const link = navigateURL.slice(0, indexOfQueryStart)

            const personData: PersonData = {
              displayName,
              companyName,
              location,
            }

            const data: any = this.calculateConfidence(profileSearchDto, personData)

            name_linked_data.push({
              confidence: data,
              linkedInURL: link
            })
          });
        }

      } catch (error) {
        console.error(error.message);

      }

    }


    if (name_linked_data.length > 0) {

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (const data of name_linked_data) {
        await delay(1200); // wait 1.2 seconds before each call

        const options = {
          method: 'POST',
          url: 'https://linkedin-data-scraper.p.rapidapi.com/person',
          headers: {
            'x-rapidapi-key': 'bcfab707b6msh3b13e094ad1bf26p19071ajsn41f8ae0ee227',
            'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
            'Content-Type': 'application/json'
          },
          data: {
            link: data?.linkedInURL
          }
        };
        try {
          const response = await axios.request(options);
          if (response?.data?.success) {


            const companyName = response?.data?.data?.experiences?.map((item: any) => item?.title + " " + item?.subtitle).join(', ')


            const displayName: string = `${response?.data?.data?.fullName}`

            const location: string = `${response?.data?.data?.addressWithoutCountry}, ${response?.data?.data?.addressCountryOnly}`
            const link: string = `https://www.linkedin.com/in/${response?.data?.data?.publicIdentifier}`

            const personData: PersonData = {
              displayName,
              companyName,
              location,
            }

            const data: any = this.calculateConfidence(profileSearchDto, personData)

            url_linked_data.push({
              confidence: data,
              linkedInURL: link
            })
          }

        } catch (error) {
          console.error(error);

        }
        console.log("url prit")

      }

    }
    console.log("Name", name_linked_data)
    console.log("Link", url_linked_data)
  }
}
