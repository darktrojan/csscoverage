# csscoverage

## What it does

This is a CSS code coverage tool. As you load pages from your website in Firefox, it goes through each stylesheet and checks which CSS selectors actually match one or more elements on the page. Then it displays a list of selectors which haven't been seen on any page, these are the ones you might be able to remove from your stylesheets.

## Install

Packaged versions of this add-on can be found at https://addons.mozilla.org/en-US/firefox/addon/css-coverage/ .

To get a working version of this repo in your Firefox profile, clone it into your extensions directory as `csscoverage@darktrojan.net` and start Firefox. You'll need to use Nightly or Developer Edition, as the source code is not signed.

## Usage

After install you'll see a button on your toolbar (currently this button has a white diamond and four coloured triangles for an icon). Clicking it will open the sidebar, where results will be displayed. To scan the current page at any point click the button labelled "Scan Current Page".

To set up automatic scanning of pages when they load, the pref `extensions.csscoverage.domains` is a space-separated list of hostnames. Include the port number if necessary (e.g. `localhost:8080`).

If you'd like your page itself to trigger scanning at any point, e.g. as part of unit tests, have it run this code:
```
dispatchEvent(new CustomEvent('CSSCoverage:scanPage', {bubbles: true}));
```

**Pref names, labels for things, icons etc. are all likely to change. At this stage I'm concentrating on making things work before making them pretty.**
