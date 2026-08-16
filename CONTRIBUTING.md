# Contributing

Thanks for helping make AWS Community Globe more accurate and useful.

## Add a country 3D spotlight

Singapore and Sri Lanka are the first supported country spotlights. A new
country needs accurate Student Builder Group locations before its 3D view can
be enabled.

1. Fork the repository and create a focused feature branch.
2. Verify the latitude and longitude for each Student Builder Group in the
   country using an authoritative campus or community source.
3. Add a unique query key, country camera configuration, and any corrected
   member coordinates to `src/config/countrySpotlights.js`.
4. Test the country in dark and light themes, on desktop and mobile.
5. Run `npm run build` and open a pull request describing the location sources.

Please keep monthly dataset files owned by the refresh scripts. Country-specific
coordinate corrections should live in the spotlight configuration unless the
live AWS Builder Center record itself has changed.

Sri Lanka was originally contributed by
[@PamudaUposath in PR #2](https://github.com/Jagatees/aws-community-world/pull/2).
