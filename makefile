.PHONY: help
help: makefile
	@tail -n +4 makefile | grep ".PHONY"


# Default target
all: build


# Install dependencies
.PHONY: install
install:
	npm init -y
	npm install --save-dev esbuild @types/react @types/react-dom
	npm install react react-dom


# Build target to convert index.tsx to deployable index.html
.PHONY: build
build: install
	mkdir -p dist
	# Transform JSX to plain JavaScript using esbuild
	cat index.tsx | sed 's/import React, { useState, useEffect } from '\''react'\'';//' | sed 's/export default HackerNewsTop100;//' > dist/component.jsx
	npx esbuild dist/component.jsx --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --target=es2015 --outfile=dist/component.js
	sed '/{{COMPONENT_CODE}}/r dist/component.js' template.html | sed '/{{COMPONENT_CODE}}/d' > dist/index.html
	rm dist/component.jsx dist/component.js


# Clean build artifacts
.PHONY: clean
clean:
	rm -rf dist bundle.js package.json package-lock.json node_modules


# Development server (optional)
serve: build
	cd dist && python3 -m http.server 8000
