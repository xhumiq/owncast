ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
SOURCE_COMMIT = $(shell git rev-parse --verify HEAD)
SOURCE_TAG = $(shell git describe --abbrev=0 --tags)
BUILD_VERSION=$(shell bv=${SOURCE_TAG} && echo $${bv:1:50})
BRANCH = $(shell git for-each-ref --format='%(objectname) %(refname:short)' refs/heads | awk "/^$$(git rev-parse HEAD)/ {print \$$2}")
COMMIT_MSG = $(shell echo "$$(git log -1 HEAD --pretty=format:%s)" | sed -e 's/'\''/"/g')
BUILD_TIME = $(shell date "+%F_%H:%M:%S")
BUILD_PATH = /ntc/builds/meet
PKG_PATH = /ntc/packages/owncast
BUILD_DISTRO = linux-64bit
BUILD_FLAGS = -s -X github.com/owncast/owncast/config.GitCommit=${SOURCE_COMMIT} -X github.com/owncast/owncast/config.VersionNumber=v${BUILD_VERSION} -X github.com/owncast/owncast/config.BuildPlatform=${BUILD_DISTRO}
CGO_ENABLED = 0
GOPRIVATE=bitbucket.org/xhumiq
AWS_PROFILE = ntc
DEPLOY_VER = v0.2.1
BIN_NAME = owncast

GOLANG_TAG=1.17-stretch
BUILD_OS=linux

aws_region = ap-northeast-1
docker_reg = ${AWS_DOCKER_REG}
dkname = ${BIN_NAME}
defPort = 5010

export

#https://github.com/chromedp/examples

all: build-app

ecr_push: clean-dist build-admin build-css docker_build tag aws_login push

docker_build: docker_loc_build

build-all: clean-dist build-admin build-app build-css

build: build-app

build-app:
	@export GOPRIVATE=bitbucket.org/xhumiq; \
	go mod tidy && \
	export CGO_ENABLED=1; export GOOS=linux; go build -ldflags "${BUILD_FLAGS}" -o ${BUILD_PATH}/owncast/${BUILD_DISTRO}/${BIN_NAME}
	@echo "Built ${BUILD_PATH}/owncast/${BUILD_DISTRO}/${BIN_NAME}"

build-app-new:
	@mkdir -p ${BUILD_PATH}/owncast/${BUILD_DISTRO}
	@cp README.md ${BUILD_PATH}/owncast/${BUILD_DISTRO}/
	@cp -R webroot/ ${BUILD_PATH}/owncast/${BUILD_DISTRO}/webroot/
	@cp -R static/ ${BUILD_PATH}/owncast/${BUILD_DISTRO}/static/
	@export CGO_ENABLED=1; docker run --rm \
		-v ${ROOT_DIR}:/src \
		-v ${BUILD_PATH}/owncast/${BUILD_DISTRO}:/dist \
		-e BUILD_FLAGS \
		-e SOURCE_COMMIT \
		go-build:${GOLANG_TAG}

build-admin:
	@build/admin/bundleAdmin.sh

build-css:
	@mkdir -p ${BUILD_PATH}/owncast/${BUILD_DISTRO}
	@rm -rf ${BUILD_PATH}/owncast/${BUILD_DISTRO}/webroot
	@cp -R webroot/ ${BUILD_PATH}/owncast/${BUILD_DISTRO}/webroot/
	@cd build/javascript; \
	npm install --quiet --no-progress && \
	NODE_ENV="production" ./node_modules/.bin/tailwind build | ./node_modules/.bin/postcss >  "${BUILD_PATH}/owncast/${BUILD_DISTRO}/webroot/js/web_modules/tailwindcss/dist/tailwind.min.css"

clean-dist:
	@rm -rf ${BUILD_PATH}/owncast/${BUILD_DISTRO}

clean-hls:
	@rm -rf ./webroot/hls/* ./hls/* ./webroot/thumbnail.jpg

package-zip: build-all
	@mkdir -p ${PKG_PATH}
	@rm ${PKG_PATH}/owncast-${BUILD_VERSION}-${BUILD_DISTRO}.zip
	@cd ${BUILD_PATH}/owncast/${BUILD_DISTRO}; \
	zip -r -q -8 ${PKG_PATH}/owncast-${BUILD_VERSION}-${BUILD_DISTRO}.zip .
	@echo "zipped ${PKG_PATH}/owncast-${BUILD_VERSION}-${BUILD_DISTRO}.zip"

ocdeploy-%:
	scp ${PKG_PATH}/owncast-${BUILD_VERSION}-${BUILD_DISTRO}.zip vcast-$*:/opt/owncast/owncast-${BUILD_VERSION}-${BUILD_DISTRO}.zip

docker_go-build:
	cd ./build/release/docker && \
	docker pull golang:${GOLANG_TAG} && \
	docker build . -f go-build --build-arg GOLANG_TAG --build-arg BUILD_OS -t go-build:${GOLANG_TAG}

build-bullseye:
	docker run --rm \
		-v ${ROOT_DIR}:/src \
		-v ${BUILD_PATH}/owncast/${BUILD_DISTRO}:/dist \
		-e BUILD_FLAGS \
		-e SOURCE_COMMIT \
		go-build:${GOLANG_TAG}

docker_loc_build:
	docker build . -t ${dkname}:${BUILD_VERSION} \
		--build-arg BRANCH=${BRANCH} \
		--build-arg SOURCE_TAG=${SOURCE_TAG} \
		--build-arg SOURCE_COMMIT=${SOURCE_COMMIT} \
		--build-arg COMMIT_MSG='${COMMIT_MSG}' \
		--build-arg BUILD_VERSION=${BUILD_VERSION} \
		--build-arg VERSION=${SOURCE_TAG} \
		--build-arg GIT_COMMIT=${SOURCE_COMMIT} \
		--build-arg BUILD_TIME=${BUILD_TIME} \
		--build-arg AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
		--build-arg PROJ_SQL_PWD=${PROJ_SQL_PWD} \
		--build-arg PROJ_SMTP_PWD=${PROJ_SMTP_PWD} && \
		docker tag ${dkname}:${BUILD_VERSION} ${dkname}:latest && \
		docker tag ${dkname}:$(BUILD_VERSION) ${dkname} && \
		echo Set ${dkname}:$(BUILD_VERSION) to latest && \
		echo "SOURCE_COMMIT=${SOURCE_COMMIT}" && \
		echo "SOURCE_TAG=   ${SOURCE_TAG}" && \
		echo "COMMIT_MSG=   ${COMMIT_MSG}" && \
		echo "BUILD_VERSION=${BUILD_VERSION}" && \
		echo "BUILD_TIME=   ${BUILD_TIME}" && \
		echo "BRANCH=       ${BRANCH}"

aws_login:
	@awd_ecr_passwd=$$(aws ecr get-login-password --region ${aws_region}); \
	docker login --username AWS --password $${awd_ecr_passwd} ${docker_reg}

tag:
	docker tag ${dkname} ${docker_reg}/${dkname}:${BUILD_VERSION} && \
	docker tag ${dkname} ${docker_reg}/${dkname}:latest

push:
	docker push ${docker_reg}/${dkname}:${BUILD_VERSION}
	docker push ${docker_reg}/${dkname}:latest


inc-patch:
	@export MEET_TAG=$$(git tag --points-at $$(git rev-parse --verify HEAD) | tail -1) && \
	export PATCH_TAG=$$(echo ${SOURCE_TAG} | cut -c 2- | awk -F'[.-]'  '{ \
		major=$$1; \
		minor=$$2; \
		patch=$$3; \
		patch += 1; \
		major += minor / 100; \
		minor = minor % 100; \
		minor += patch / 100; \
		patch = patch % 100; \
		printf( "v%d.%d.%d\n", major, minor, patch); \
	}'); \
	git tag -d $${PATCH_TAG} || true && \
	git push --delete mine $${PATCH_TAG} || true && \
	git add . --all && \
	git commit -am "${COMMIT_MSG}" || true && \
	git tag -a $${PATCH_TAG} -m "$${MEET_TAG}" && \
	git push mine ${BRANCH} || true && \
	git push mine ${BRANCH} --tags

inc-build:
	@export MEET_TAG=$$(git tag --points-at $$(git rev-parse --verify HEAD) | tail -1) && \
	export BUILD_TAG=$$(echo ${SOURCE_TAG} | cut -c 2- | awk -F'[.-]'  '{ \
		major=$$1; \
		minor=$$2; \
		patch=$$3; \
		build=$$4; \
		build += 1; \
		major += minor / 100; \
		minor = minor % 100; \
		minor += patch / 100; \
		patch = patch % 100; \
		printf( "v%d.%d.%d-%d\n", major, minor, patch, build ); \
	}'); \
	git tag -d $${BUILD_TAG} || true && \
	git push --delete mine $${BUILD_TAG} || true && \
	git add . --all && \
	git commit -am "${COMMIT_MSG}" || true && \
	git tag -a $${BUILD_TAG} -m "$${MEET_TAG}" && \
	git push mine ${BRANCH} || true && \
	git push mine ${BRANCH} --tags

