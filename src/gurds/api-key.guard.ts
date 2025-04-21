import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) { }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key']; // Get the API key from the request headers

        const validApiKey = this.configService.get<string>('API_KEY'); // Get the valid API key from environment variables

        if (apiKey && apiKey === validApiKey) {
            return true; // Allow the request to proceed if the API key is valid
        }

        return false; // Reject the request if the API key is invalid
    }
}
