<p align="center">
  <a href="https://github.com/peachjar/action-run-migrations/actions"><img alt="typescript-action status" src="https://github.com/peachjar/action-run-migrations/workflows/build-test/badge.svg"></a>
</p>

# Github Action: Run Migrations

Run migrations in one of Peachjar's environments.  If you are not Peachjar, this will be no help to you!

## Usage

Normal usage is to supply AWS credentials, the environment, the docker image (assumes `peachjar/` prefix) and the Kubernetes secret.

```
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    mig_image: svc-foo-db
    mig_secret: flyway-foo-postgres-env
```

If you have multiple migration workflows to run, add up to 3 by appending the index number (starting at 2) to the end of the param name.

```
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
    mig_secret_3: flyway-foo-timescale-env
```
