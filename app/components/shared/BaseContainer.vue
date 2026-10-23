<!--
  The page column every block lays out in: at most --site-content-width
  (1400px) of content with --site-gutter (20px) on both sides, centred. The
  box comes from the shared .mctl-site-container in mctl-design's site.css so
  mctl.ai, docs.mctl.ai and tg.mctl.ai share one left edge. Long-form text
  narrows inside it with .mctl-site-prose rather than with a narrower container.
-->
<template>
  <div class="base-container mctl-site-container">
    <slot />
  </div>
</template>
