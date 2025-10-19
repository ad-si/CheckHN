.PHONY: help
help: makefile
	@tail -n +4 makefile | grep ".PHONY"


# Default target
all: build


# Build target to convert index.tsx to deployable index.html
.PHONY: build
build:
	mkdir -p dist
	# Build Tailwind CSS
	npx @tailwindcss/cli -i input.css -o dist/styles.css --minify
	# Transform JSX to plain JavaScript using esbuild
	cat index.tsx | sed 's/import React, { useState, useEffect } from '\''react'\'';//' | sed 's/export default HackerNewsTop100;//' > dist/component.jsx
	npx esbuild dist/component.jsx --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --target=es2015 --outfile=dist/component.js
	sed '/{{COMPONENT_CODE}}/r dist/component.js' template.html | sed '/{{COMPONENT_CODE}}/d' > dist/index.html
	rm dist/component.jsx dist/component.js


# Clean build artifacts
.PHONY: clean
clean:
	rm -rf dist
	rm -rf node_modules


# Development server
.PHONY: dev
dev: build
	cd dist && serve
