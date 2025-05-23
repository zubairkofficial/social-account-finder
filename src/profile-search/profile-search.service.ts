import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ProfileSearchDto } from './dto/profile.dto';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

export enum ConfidenceCount {
  FULL_NAME = 50,
  COMPANY = 10,
  EMAIL = 100,
}

export enum AddressConfidenceCount {
  CITY = 15,
  ADDRESS = 5,
  STATE = 5,
  COUNTRY = 5,
}

interface PersonData {
  displayName: string;
  location: string;
  companyName: string;
  link?: string;
}

interface ResultCompare {
  confidence: number;
  linkedInURL: string;
}

const responseSchema = z.object({
  confidence: z.number().describe('The confidence score between 0 and 100'),
  name_matched: z.boolean(),
  city_matched: z.boolean(),
  state_matched: z.boolean(),
  country_matched: z.boolean(),
  company_matched: z.boolean()
});

type ResponseType = z.infer<typeof responseSchema>;
type ExtendedResponseType = ResponseType & {
  linkedInURL?: string; // Optional string property
  email_matched?: boolean;
  photoURL?: string
};

@Injectable()
export class ProfileSearchService {
  private readonly openai: OpenAI;
  private openAIKey: string;
  private rapidAPIkey: string;

  constructor(
    private configService: ConfigService,

  ) {
    this.openAIKey = this.configService.get<any>('OPEN_AI_KEY');
    this.rapidAPIkey = this.configService.get<any>('RAPID_API_KEY')
    this.openai = new OpenAI({
      apiKey: this.openAIKey
    });

  }

  async getConfidenceFromOpenAI(personData: ProfileSearchDto, scrapedData: any, email: boolean | undefined): Promise<ResponseType> {
    const contextData = `
  You are an assistant that determines whether the provided LinkedIn profile belongs to the given person.
  Consider the name, location, and company data, ignoring letter case.
  
  Confidence will be accumulated as follows:
  
  - NAME = 50,
  - COMPANY = 20,
  - CITY = 15,
  - ADDRESS = 5,
  - STATE = 5,
  - COUNTRY = 5,
  - EMAIL = 100 (if email matches).

  Person Data:
  Email: ${email}
  Name: ${personData.name}
  City: ${personData.address?.city}
  State: ${personData.address?.state}
  Country: ${personData.address?.country}
  Company: ${personData.company}

  LinkedIn Scraped Data:
  Name: ${scrapedData.displayName}
  Location: ${scrapedData.location}
  Companies: ${scrapedData.companyName}

  Instructions:
  1. If the email is provided and matches, assign a confidence score of 100.
  2. If the email is not provided (undefined), or does not match, calculate the confidence based on the other parameters:
    - If the name matches, add 50 points.
    - If the company matches, add 20 points.
    - If the city matches, add 15 points.
    - If the address matches, add 5 points.
    - If the state matches, add 5 points.
    - If the country matches, add 5 points.
  3. If the email is incorrect (does not match), the confidence will still be calculated based on the other parameters (excluding EMAIL).

  Please calculate the confidence (between 0 and 100) according to the given values of each parameter score that this LinkedIn profile matches the provided person data.
`;


    const parser = StructuredOutputParser.fromZodSchema(responseSchema);

    const chatModel = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      apiKey: this.openAIKey
    });

    const prompt = PromptTemplate.fromTemplate(
      `
      ${contextData}
      Answer the following as a JSON object with the structure defined below:

      {{
        "confidence": number,
        "name_matched" : boolean,
        "city_matched" : boolean,
        "state_matched" : boolean,
        "country_matched" : boolean,
        "company_matched" : boolean
    }}
    `
    );

    const chain = RunnableSequence.from([prompt, chatModel, parser]);
    const response = await chain.invoke({
      context: contextData,
      question: 'Determine the confidence of this match.',
    });

    return response;
  }

  async calculateConfidence(profileSearchDto: ProfileSearchDto, person_data: PersonData, email: boolean | undefined): Promise<ResponseType> {

    const data = await this.getConfidenceFromOpenAI(profileSearchDto, person_data, email);

    return data;
  }


  async getLinkedProfile(profileSearchDto: ProfileSearchDto): Promise<ExtendedResponseType> {
    if (this.openAIKey === "" || !this.openAIKey) {
      throw new HttpException("No api key is found", HttpStatus.BAD_REQUEST)
    }

    let email_linked_data: ExtendedResponseType = {
      linkedInURL: "",
      confidence: 0,
      email_matched: false,
      name_matched: false,
      city_matched: false,
      state_matched: false,
      country_matched: false,
      company_matched: false,
      photoURL: ""
    }
    let name_linked_data: ExtendedResponseType[] = [];
    let url_linked_data: ExtendedResponseType[] = [];
    let outputObject: ExtendedResponseType = {
      email_matched: false,
      confidence: 0,
      name_matched: false,
      city_matched: false,
      state_matched: false,
      country_matched: false,
      company_matched: false,
      linkedInURL: "",
    };

    // Search by email
    if (profileSearchDto.email) {
      const options = {
        method: 'POST',
        url: 'https://linkedin-data-scraper.p.rapidapi.com/email_to_linkedin_profile',
        headers: {
          'x-rapidapi-key': this.rapidAPIkey,
          'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        data: {

          email: profileSearchDto.email,
        },
      };

      try {
        const response = await axios.request(options);
        if (response?.data?.success) {
          if (response?.data?.linkedinUrl !== "Not found") {
            let companyName: string = `${response?.data?.person_data?.companyName}, `;
            companyName =
              companyName + response?.data?.person_data?.positions?.positionHistory?.map((position: any) => position?.company?.companyName).join(', ');

            const displayName: string = `${response?.data?.person_data?.displayName}`;
            const location: string = `${response?.data?.person_data?.location}`;
            const link: string = `${response?.data?.linkedinUrl}`;
            const photoURL = response?.data?.person_data?.photoUrl

            const personData: PersonData = {
              displayName,
              companyName,
              location,
            };

            const data = await this.calculateConfidence(profileSearchDto, personData, undefined);
            email_linked_data = {
              confidence: 100,
              linkedInURL: link,
              email_matched: true,
              name_matched: data.name_matched,
              city_matched: data.city_matched,
              state_matched: data.state_matched,
              country_matched: data.country_matched,
              company_matched: data.company_matched,
              photoURL
            };

          } else {
            email_linked_data = {
              confidence: 0,
              linkedInURL: "",
              email_matched: false,
              name_matched: false,
              city_matched: false,
              state_matched: false,
              country_matched: false,
              company_matched: false,
              photoURL: ""
            };
          }
        }
      } catch (error) {
        console.error(error.message);
      }
    }

    if (email_linked_data.email_matched) {
      outputObject = email_linked_data
    }

    if (profileSearchDto.name && !email_linked_data.email_matched) {

      const options = {
        method: 'POST',
        url: 'https://linkedin-data-scraper.p.rapidapi.com/search_person',
        headers: {
          'x-rapidapi-key': this.rapidAPIkey,
          'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
          'Content-Type': 'application/json',
        },

        data: {
          keywords: `${profileSearchDto.name} ${profileSearchDto.company ? ' , ' + profileSearchDto.company : ''}`,
          // , ${profileSearchDto.address?.city ? profileSearchDto.address?.city : ''}, ${profileSearchDto.address?.state ? profileSearchDto.address?.state : ''}, ${profileSearchDto.address?.country ? profileSearchDto.address?.country : ''}, ${profileSearchDto.company ? profileSearchDto.company : ''}
          geoUrns: '',
          count: 50,
        },
      };

      try {
        const response = await axios.request(options);
        if (response?.data?.success) {

          // Process name matches
          for (const person_data of response?.data?.response) {
            await new Promise(resolve => setTimeout(resolve, 1200));

            const displayName: string = `${person_data?.fullName}`;
            const companyName: string = `${person_data?.primarySubtitle}`;
            const location: string = `${person_data?.secondarySubtitle}`;
            const navigateURL = person_data?.navigationUrl.trim() || '';
            const indexOfQueryStart = navigateURL.indexOf('?');
            const link = navigateURL.slice(0, indexOfQueryStart);
            const photoURL = person_data?.profilePicture

            const personData: PersonData = {
              displayName,
              companyName,
              location,
            };

            const data = await this.calculateConfidence(profileSearchDto, personData, email_linked_data.email_matched);
            name_linked_data.push({
              confidence: data.confidence,
              name_matched: data.name_matched,
              city_matched: data.city_matched,
              state_matched: data.state_matched,
              country_matched: data.country_matched,
              linkedInURL: link,
              company_matched: data.company_matched,
              email_matched: email_linked_data.email_matched,
              photoURL
            });
          }

          // Process URL matches from name results
          if (name_linked_data.length > 0) {
            const highestConfidence = Math.max(...name_linked_data.map(obj => obj.confidence));
            const highestConfidenceObjects = name_linked_data.filter(obj => obj.confidence === highestConfidence);

            for (const linkObject of highestConfidenceObjects) {
              await new Promise(resolve => setTimeout(resolve, 1200));

              const options = {
                method: 'POST',
                url: 'https://linkedin-data-scraper.p.rapidapi.com/person',
                headers: {
                  'x-rapidapi-key': this.rapidAPIkey,
                  'x-rapidapi-host': 'linkedin-data-scraper.p.rapidapi.com',
                  'Content-Type': 'application/json'
                },
                data: {
                  link: linkObject.linkedInURL
                }
              };

              const response = await axios.request(options);
              if (response?.data?.success) {
                const companyName = response?.data?.data?.experiences?.map((item: any) => item?.title + " " + item?.subtitle).join(', ') + ', ' + response?.data?.data?.headline;
                const displayName: string = `${response?.data?.data?.fullName}`;
                const location: string = `${response?.data?.data?.addressWithoutCountry}, ${response?.data?.data?.addressCountryOnly}`;
                const link: string = `https://www.linkedin.com/in/${response?.data?.data?.publicIdentifier}`;
                const photoURL = response?.data?.data?.profilePic;
                const personData: PersonData = {
                  displayName,
                  companyName,
                  location,
                };

                const data = await this.calculateConfidence(profileSearchDto, personData, !(email_linked_data.linkedInURL === "" || email_linked_data.linkedInURL === "Not Found"));
                url_linked_data.push({
                  confidence: data.confidence,
                  name_matched: data.name_matched,
                  city_matched: data.city_matched,
                  state_matched: data.state_matched,
                  country_matched: data.country_matched,
                  company_matched: data.company_matched,
                  linkedInURL: link,
                  email_matched: email_linked_data.email_matched,
                  photoURL
                });
              }
            }



            if (url_linked_data.length > 0) {
              const highestConfidenceNameObject = name_linked_data.reduce((maxObj, currentObj) => {
                return (currentObj.confidence > maxObj.confidence) ? currentObj : maxObj;
              }, name_linked_data[0]);
              const highestConfidenceURLObject = url_linked_data.reduce((maxObj, currentObj) => {
                return (currentObj.confidence > maxObj.confidence) ? currentObj : maxObj;
              }, url_linked_data[0]);

              if (highestConfidenceNameObject.confidence > highestConfidenceURLObject.confidence) {
                outputObject = highestConfidenceNameObject
              } else if (highestConfidenceNameObject.confidence < highestConfidenceURLObject.confidence) {
                outputObject = highestConfidenceURLObject
              } else if (highestConfidenceNameObject.confidence === highestConfidenceURLObject.confidence) {
                outputObject = {
                  email_matched: false,
                  name_matched: highestConfidenceURLObject.name_matched || highestConfidenceNameObject.name_matched,
                  city_matched: highestConfidenceURLObject.city_matched || highestConfidenceNameObject.city_matched,
                  state_matched: highestConfidenceURLObject.state_matched || highestConfidenceNameObject.state_matched,
                  country_matched: highestConfidenceURLObject.country_matched || highestConfidenceNameObject.country_matched,
                  company_matched: highestConfidenceURLObject.company_matched || highestConfidenceNameObject.company_matched,
                  linkedInURL: highestConfidenceNameObject.linkedInURL || highestConfidenceURLObject.linkedInURL,
                  confidence: highestConfidenceNameObject.confidence || highestConfidenceURLObject.confidence,
                  photoURL: highestConfidenceNameObject.photoURL || highestConfidenceURLObject.photoURL
                };
              }
            }
          }
        }
      } catch (error) {
        console.error(error.message);
      }
    }


    return outputObject
  }



  async searchGoogle(personData: ProfileSearchDto) {
    const options = {
      method: 'GET',
      url: 'https://google-search74.p.rapidapi.com/',
      params: {
        query: `${personData.name} site:instagram.com`,
        limit: '15',
        related_keywords: `${personData.address?.city}, ${personData.address?.state}, ${personData.address?.country}, ${personData.company}, ${personData.email}`,
      },
      headers: {
        'x-rapidapi-key': this.rapidAPIkey,
        'x-rapidapi-host': 'google-search74.p.rapidapi.com',
      },
    };

    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Error in Google Search API');
    }
  }

  // Function to get Instagram data
  async getInstagramProfile(username: string) {
    const options = {
      method: 'GET',
      url: 'https://instagram-premium-api-2023.p.rapidapi.com/v1/user/by/username',
      params: {
        username: username,
      },
      headers: {
        'x-rapidapi-key': this.rapidAPIkey,
        'x-rapidapi-host': 'instagram-premium-api-2023.p.rapidapi.com',
      },
    };

    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      console.error(error);
      throw new Error('Error in Instagram API');
    }
  }


  async compareImages(imageUrl1: string, imageUrl2: string): Promise<number> {
    if (!imageUrl1 || !imageUrl2) {
      return 0
    }
    try {

      // Compare these two images of people and identify if they are identical. just return match percentage integer from 0 to 100 and nothing else
      const response = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: zodResponseFormat(z.object({
          photo_match_confidence: z.number()
        }), 'confidence_format'),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Compare these two images of people and identify if they are identical. just return match percentage integer from 0 to 100 in JSON format {{photo_match_confidence: number}}" },
              {
                type: "image_url",
                image_url: {
                  "url": imageUrl1
                },
              },
              {
                type: "image_url",
                image_url: {
                  "url": imageUrl2
                },
              }
            ],
          },
        ],
        max_tokens: 300,
      });

      // Assuming response.text will give a comparison result
      const comparisonResult: any = response?.choices[0]?.message?.content;

      const comparisonResultJSON = JSON.parse(comparisonResult)

      // Basic threshold to decide if the images are identical or not
      const confidenceThreshold = 0.7; // Adjust this threshold based on the API response
      if (comparisonResultJSON) {
        return comparisonResultJSON.photo_match_confidence; // Images are likely identical based on the result
      } else {
        return 0;
      }
    } catch (error) {
      console.error('Error comparing images:', error);
      throw new Error('Error in image comparison API');
    }
  }


  async getInstaConfidenceFromOpenAI(
    personData: ProfileSearchDto,
    scrapedData: any // Instagram data
  ): Promise<ResponseType> {
    const contextData = `
    You are an assistant that determines whether the provided Instagram profile belongs to the given person.
    Consider the name, location (city), and company (from the biography), ignoring letter case.
  
    Confidence will be accumulated as follows:
    
    - NAME = 50,
    - COMPANY = 20,
    - CITY = 15,
    - STATE = 5,
    - COUNTRY = 5
    
    Person Data:
    Name: ${personData.name}
    City: ${personData.address?.city}
    State: ${personData.address?.state}
    Country: ${personData.address?.country}
    Company: ${personData.company}
  
    Instagram Profile Scraped Data:
    Name: ${scrapedData.full_name}
    Location (City): ${scrapedData.city_name}
    Biography: ${scrapedData.biography}
  
    Instructions:
    1. Calculate the confidence based on the parameters below:
      - If the name matches, add 50 points.
      - If the company (biography) matches, add 20 points.
      - If the city matches, add 15 points.
      - If the address matches, add 5 points.
      - If the state matches, add 5 points.
      - If the country matches, add 5 points.
  
    Please calculate the confidence (between 0 and 100) according to the given values of each parameter score that this Instagram profile matches the provided person data.
  `;

    const parser = StructuredOutputParser.fromZodSchema(responseSchema);

    const chatModel = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      apiKey: this.openAIKey
    });

    const prompt = PromptTemplate.fromTemplate(
      `
      ${contextData}
      Answer the following as a JSON object with the structure defined below:
  
      {{
        "confidence": number,
        "name_matched" : boolean,
        "city_matched" : boolean,
        "state_matched" : boolean,
        "country_matched" : boolean,
        "company_matched" : boolean
      }}
      `
    );

    const chain = RunnableSequence.from([prompt, chatModel, parser]);
    const response = await chain.invoke({
      context: contextData,
      question: 'Determine the confidence of this match.',
    });

    return response;
  }

  extractUsernameFromUrl(url) {
    const match = url.match(/https:\/\/www\.instagram\.com\/([^\/]+)/);
    return match ? match[1] : null;
  }


  async getFinalResult(personData: ProfileSearchDto, linkedPhotoURL: any) {
    const results: any[] = [];

    // Get Google Search results
    const googleResults = await this.searchGoogle(personData);

    // Create unique array based on extracted username
    const uniqueData: any = Array.from(
      googleResults?.results?.reduce((map, obj) => {
        // Extract username from the URL
        const username = this.extractUsernameFromUrl(obj.url);

        // If username is valid, use it as the key in the Map
        if (username) {
          map.set(username, obj);
        }

        return map;
      }, new Map()).values()
    );



    // Populate results array
    for (const result of uniqueData) {

      const instagramUrl = result?.url;
      const username = this.extractUsernameFromUrl(instagramUrl);

      // Get Instagram profile details
      let instagramProfile: any
      try {
        instagramProfile = await this.getInstagramProfile(username);
      } catch (error) {
        continue
      }


      // Extract necessary info
      const profilePicUrl = instagramProfile.profile_pic_url;
      instagramProfile.biography = instagramProfile.biography + ' ' + result.description;

      // Get confidence score and matched attributes using OpenAI
      const confidenceResult = await this.getInstaConfidenceFromOpenAI(personData, instagramProfile);

      // Create final result object
      const resultObject = {
        name_matched: confidenceResult.name_matched,
        city_matched: confidenceResult.city_matched,
        state_matched: confidenceResult.state_matched,
        country_matched: confidenceResult.country_matched,
        company_matched: confidenceResult.company_matched,
        instagramURL: `https://www.instagram.com/${username}`,
        photo_match_confidence_with_linkedIn: 0, // Default, assuming no photo match initially
        confidence: confidenceResult.confidence, // Confidence score from OpenAI,
        instaPhotoURL: profilePicUrl
      };

      results.push(resultObject);
    }

   
    for (const result of results) {
      try {
        const profilePicUrl = result.instaPhotoURL;
        const photoMatchConfidence = await this.compareImages(profilePicUrl, linkedPhotoURL);

        result.photo_match_confidence_with_linkedIn = photoMatchConfidence
      } catch (error) {
        continue
      }

    }
    const highestConfidenceInstaObject = results.reduce((maxObj, currentObj) => {
      return (currentObj.photo_match_confidence_with_linkedIn > maxObj.photo_match_confidence_with_linkedIn) ? currentObj : maxObj;
    }, results[0]);

    return highestConfidenceInstaObject;
  }




  async getUserSocial(profileSearchDto: ProfileSearchDto) {
    const linkedData: ExtendedResponseType = await this.getLinkedProfile(profileSearchDto)
    const instaData = await this.getFinalResult(profileSearchDto, linkedData.photoURL)

    return {
      linkedin: linkedData,
      instagram: instaData
    }

  }


}