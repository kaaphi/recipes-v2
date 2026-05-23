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