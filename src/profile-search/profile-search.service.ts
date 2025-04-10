import { Injectable } from '@nestjs/common';
import axios from 'axios';



interface AddressProps {
  address1: string,
  address2?: string,
  city: string,
  state: string,
  country: string,
}

interface ProfileSearchProps {
  name?: string,
  email?: string,
  company?: string,
  address?: AddressProps
}

@Injectable()
export class ProfileSearchService {
  private readonly apiUrl = 'https://api.pipl.com/search/';
  private readonly apiKey = 'your-api-key'; // Replace with your actual API key


  //get email, name and every parameter, first search by email if no confidence then go for name and get confidence and so on...

  //find profile with email

  ///find profile by name

  //find profile by link

  // get person data

  //calculate confidence




  async getLinkedProfile(email: string, name: string,) {

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
