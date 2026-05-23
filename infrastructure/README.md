# Configuring a Dev Stack

Add a dev.toml profile with the following:
```toml
id = "dev"
is_dev = true
aws_account = "123456789000"
aws_region = "us-west-2"

[cognito]
reply_to_email = "reply@example.com"
```

# Update Managed Login Settings
To update the Cognito managed login settings for the CDK app from the configuration of an existing stack, run:
```shell
uv run get_managed_login_settings.py dev
```
Replace `dev` with a different profile id if you want to update the settings using different deployment.