variable "IMAGE_REGISTRY" {
  default = "local"
}

variable "IMAGE_TAG" {
  default = "dev"
}

variable "SOURCE_REPOSITORY" {
  default = "local"
}

variable "SOURCE_REVISION" {
  default = "dev"
}

group "default" {
  targets = ["api", "web", "app", "dashboard"]
}

group "release" {
  targets = ["api", "web", "app", "dashboard"]
}

target "_common" {
  context = "."
  pull    = true
  labels = {
    "org.opencontainers.image.source"   = "${SOURCE_REPOSITORY}"
    "org.opencontainers.image.revision" = "${SOURCE_REVISION}"
  }
}

target "api" {
  inherits   = ["_common"]
  dockerfile = "deploy/docker/Dockerfile.api"
  tags       = ["${IMAGE_REGISTRY}/mushroom-api:${IMAGE_TAG}"]
}

target "web" {
  inherits   = ["_common"]
  dockerfile = "deploy/docker/Dockerfile.next"
  args = {
    APP = "web"
  }
  tags = ["${IMAGE_REGISTRY}/mushroom-web:${IMAGE_TAG}"]
}

target "app" {
  inherits   = ["_common"]
  dockerfile = "deploy/docker/Dockerfile.next"
  args = {
    APP = "app"
  }
  tags = ["${IMAGE_REGISTRY}/mushroom-app:${IMAGE_TAG}"]
}

target "dashboard" {
  inherits   = ["_common"]
  dockerfile = "deploy/docker/Dockerfile.next"
  args = {
    APP = "dashboard"
  }
  tags = ["${IMAGE_REGISTRY}/mushroom-dashboard:${IMAGE_TAG}"]
}
