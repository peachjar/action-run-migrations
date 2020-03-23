<p align="center">
  <a href="https://github.com/peachjar/action-run-migrations/actions"><img alt="typescript-action status" src="https://github.com/peachjar/action-run-migrations/workflows/build-test/badge.svg"></a>
</p>

# Github Action: Run Migrations

Run migrations in one of Peachjar's environments.  If you are not Peachjar, this will be no help to you!

Note:  this module has been configured to trigger deployments of images from the repository using this migration (does not support Quay -- assuming we are migrating away from it).

## Usage

Default usage assumes there is a `package.json` in the repository with the `peachjar.migrations` property:

```json
{
  "peachjar": {
    "migrations": [
      {
        "image": "svc-foo-db",
        "secret": "flyway-foo-postgres-env"
      }
    ]
  }
}
```

The schema for the migrations is:

```typescript
type ImageTagAndSecret = {
  image: string,
  secret: string,
  // Allows a fixed tag; only used in special cases like integration testing
  tag?: string,
}
```

If you are using the `package.json` method for configuration, you will only need to specify the AWS Credentials and environment you want to run the migrations on:

```yaml
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
```

Alternatively you can specify the docker image (assumes `peachjar/` prefix) and the Kubernetes secret in the action file.  These will override what is found in `package.json`.

```yaml
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    mig_image: svc-foo-db
    mig_secret: flyway-foo-postgres-env
```

If you want to override the tag of the DB image, specify the tag like this:

```yaml
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    mig_image: svc-foo-db
    mig_tag: foobar
    mig_secret: flyway-foo-postgres-env
```

If you have multiple migration workflows to run, add up to 3 by appending the index number (starting at 2) to the end of the param name.

```yaml
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    mig_image: svc-foo-db
    mig_secret: flyway-foo-postgres-env
    mig_image_2: svc-foo-v1-db
    mig_secret_2: flyway-foo-mysql-env
    mig_image_3: svc-foo-timescale-db
    mig_tag_3: foobar
    mig_secret_3: flyway-foo-timescale-env
```
