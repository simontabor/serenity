# Serenity

An easy system for generating (and local development of) static sites, using variables and templates.


## Install

```bash
$ npm install -g serenity
```

Note: may require sudo to install globally!

## Usage
```bash
$ serenity
```

Running the serenity command will immediately start watching the current directory and build the site within ./_site. It will also serve the site on localhost:4000.

## Options

<table>
  <tr>
    <th>Short</th><th>Long</th><th>Description</th>
  </tr>
  <tr>
    <td></td><td>--no-server</td><td>If specified, no server will be started and the process will exit after generating the site.</td>
  </tr>
  <tr>
    <td>-p</td><td>--port</td><td>Number. Specify the port for the server to use, defaults to 4000.</td>
  </tr>
  <tr>
    <td>-v<td><td>--version</td><td>Print the current version of serenity</td>
  </tr>
  <tr>
    <td>-a<td><td>--asset_host</td><td>Define an asset host (such as a CDN) for all compiled assets</td>
  </tr>
  <tr>
    <td>-l<td><td>--live_load</td><td>Generate assets on the fly as they're requested, rather than generating the entire site every time there's a change (default: false)</td>
  </tr>
  <tr>
    <td>-w<td><td>--watch</td><td>Watch the current directory for changes and regenerate (default: true)</td>
  </tr>
  <tr>
    <td>-c</td><td>--convert</td><td>Boolean. Default false. This will attempt to convert a Jekyll static site into a Serenity one. Very beta. BEWARE!</td>
  </tr>
</table>

Configuration options can also be specified in a file named serenity.js in the root of your directory. Usage and options for this can be seen in the `defaults.js` file
