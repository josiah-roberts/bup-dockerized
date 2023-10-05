# [bup-dockerized](https://forum.level1techs.com/t/devember-2021-dockerized-bup-backup-server/179816)

## Usage
```sh
docker run -it --rm \
  -v /place-with-stuff-to-back-up:/data:ro \
  -v /place-to-put-backups:/backups \
  -v /place-to-put-configs:/config \
  -p 8080:80 \
  arkayos/bup-dockerized
```

## WebUI

![image](https://github.com/josiah-roberts/bup-dockerized/assets/37082009/09f87e7a-2d6e-41b4-88f5-e66474b5442b)
