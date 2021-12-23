# bup-dockerized

## Usage
```sh
docker run -it --rm \
  -v /place-with-stuff-to-back-up:/data:ro \
  -v /place-to-put-backups:/backups \
  -v /place-to-put-configs:/config \
  -p 8080:80 \
  arkayos/bup-dockerized
```