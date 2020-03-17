<p align="center">
  <a href="https://github.com/peachjar/action-run-migrations/actions"><img alt="typescript-action status" src="https://github.com/peachjar/action-run-migrations/workflows/build-test/badge.svg"></a>
</p>

# Github Action: Run Migrations

Run migrations in one of Peachjar's environments.  If you are not Peachjar, this will be no help to you!

## Usage

Normal usage is to supply AWS credentials, the environment, and the image=secret pair.

```
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    migrations: svc-foo-db=flyway-foo-postgres-env
```

If you have multiple migration workflows to run, use Query Param encoded string with image=secret pairs joined by an ampersand.

```
uses: peachjar/action-run-migrations@v1
with:
    awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
    awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    environment: kauai
    migrations: svc-foo-db=flyway-foo-postgres-env&svc-foo-v1-db=flyway-foo-mysql-env
```
