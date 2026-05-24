# Recipes V2

This is a re-write of my recipes app as a react SPA with a Python backend.

## Why?

The current recipes app is a server-side rendered Java app using some niche frameworks and several home-rolled solutions. If it were at least using Spring and standard frameworks, I'd consider updating it with a few tweaks (like moving to Cognito for auth), but at this point, even keeping it as a server-side rendered Java app would be a re-write, so I might as well re-write with something completely different to keep my skills up in other besides the JVM where I am very comfortable.

## Design Choices

Ideally, I'd host everything in AWS as follows:
- IaC with CDK
- API Gateway, FastAPI in Lambda, and DynamoDB for backend
- Cloudfront for frontend
- Cognito for auth

However, to minimize costs, I'm going with the following instead:
- Self-hosted Fast API for backend
    - Deploying Python lambdas to AWS with CDK is still a big pain. This is my #1 reason to skip this for now.
    - I already have a server where I can host this (already paying for it == no added cost)
    - This app is 95% reads of data that changes very rarely. If I'm running in a persistent server, I can cache in memory (only 2 active users of the app, so this performs well) and read from DynamoDB only occasionally. This should keep data transfer out of AWS within the free tier.
    - Nice to avoid cold starts
- Self-hosted UI assets
    - Since I'm already self-hosting the API, it's trivial to self-host the static UI assets.
- DynamoDB for persistent storage
    - I could do something self-hosted here, but I want to be set up to move to the all-AWS approach if I choose to in the future. Having DynamoDB as the datastore to start with makes that simple.
- Cognito for auth
    - Cognito is still a great choice for auth. The UI doesn't really change, and the validating tokens in the backend is simple.
    
The trade-offs I'm making here minimize the costs and annoyance for me while still setting me up to fairly easily move to the ideal all-AWS solution in the future if I choose to.