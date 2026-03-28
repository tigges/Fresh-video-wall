<?php
/*
Plugin Name: DJ UrbanT Headless Visual CMS
Description: Visual editor for DJ UrbanT site content with headless endpoint mapper at /wp-json/djurbant/v1/site-content.
Version: 1.0.0
*/

if (!defined("ABSPATH")) {
    exit;
}

const DJURBANT_HVC_OPTION_KEY = "djurbant_hvc_options";
const DJURBANT_HVC_MIGRATION_FLAG = "djurbant_hvc_migrated_from_legacy_json";
const DJURBANT_HVC_LEGACY_JSON_OPTION_KEY = "djurbant_site_content_json";

function djurbant_hvc_default_schema() {
    return [
        "global" => [
            "ctaDefaults" => [
                "bookLabel" => "Book",
                "bookUrl" => "./contact.html",
            ],
            "meta" => [
                "replySlaText" => "We usually reply within 24 hours.",
            ],
            "socialLinks" => [
                "x" => [
                    "label" => "X (Twitter)",
                    "url" => "https://twitter.com/DJUrbanT",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
                "instagram" => [
                    "label" => "Instagram",
                    "url" => "https://www.instagram.com/_urbant_/",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
                "youtube" => [
                    "label" => "YouTube",
                    "url" => "https://www.youtube.com/@DJ_UrbanT",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
                "mixcloud" => [
                    "label" => "Mixcloud",
                    "url" => "https://www.mixcloud.com/urbant/",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
                "twitch" => [
                    "label" => "Twitch",
                    "url" => "https://www.twitch.tv/djurbant",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
                "tiktok" => [
                    "label" => "TikTok",
                    "url" => "https://www.tiktok.com/@_urbant_",
                    "openInNewTab" => true,
                    "enabled" => true,
                ],
            ],
        ],
        "pages" => [
            "home" => [
                "hero" => [
                    "tagline" => "Bass House. Tech House. Live Sets.",
                ],
                "bestOf" => [
                    "title" => "The Best of Artist",
                ],
                "sections" => [
                    "showStatsBand" => true,
                    "showBookingBand" => true,
                    "showSocialStrip" => true,
                ],
                "bookingBand" => [
                    "title" => "Bring the set to you.",
                    "buttonLabel" => "Book",
                    "buttonUrl" => "./contact.html",
                ],
            ],
            "video" => [
                "title" => "Video",
                "intro" => "Ranked from fetched video channel stats.",
                "topButton" => [
                    "label" => "Top Video",
                    "url" => "./index.html?bestOf=video#best-of-artist",
                ],
                "sections" => [
                    "showSocialStrip" => true,
                ],
            ],
            "audio" => [
                "title" => "Audio",
                "intro" => "Ranked from fetched audio channel stats.",
                "topButton" => [
                    "label" => "Top Audio",
                    "url" => "./index.html?bestOf=audio#best-of-artist",
                ],
                "sections" => [
                    "showSocialStrip" => true,
                ],
            ],
            "contact" => [
                "title" => "Contact DJ UrbanT",
                "introText" => "Use this form for bookings, event inquiries, collaborations, and press.",
                "formAction" => "mailto:booking@djurbant.com",
                "backButtonLabel" => "Back Home",
                "submitButtonLabel" => "Send Inquiry",
                "sections" => [
                    "showSocialStrip" => true,
                ],
            ],
        ],
    ];
}

function djurbant_hvc_deep_merge($base, $override) {
    if (!is_array($base) || !is_array($override)) {
        return $override === null ? $base : $override;
    }
    $merged = $base;
    foreach ($override as $key => $value) {
        if (array_key_exists($key, $merged)) {
            $merged[$key] = djurbant_hvc_deep_merge($merged[$key], $value);
        } else {
            $merged[$key] = $value;
        }
    }
    return $merged;
}

function djurbant_hvc_get_path($source, $path, $default = null) {
    if (!is_array($source)) {
        return $default;
    }
    $current = $source;
    foreach (explode(".", $path) as $part) {
        if (!is_array($current) || !array_key_exists($part, $current)) {
            return $default;
        }
        $current = $current[$part];
    }
    return $current;
}

function djurbant_hvc_set_path(&$target, $path, $value) {
    $parts = explode(".", $path);
    $cursor = &$target;
    foreach ($parts as $index => $part) {
        if ($index === count($parts) - 1) {
            $cursor[$part] = $value;
            return;
        }
        if (!isset($cursor[$part]) || !is_array($cursor[$part])) {
            $cursor[$part] = [];
        }
        $cursor = &$cursor[$part];
    }
}

function djurbant_hvc_to_bool($value, $default = false) {
    if (is_bool($value)) {
        return $value;
    }
    if (is_numeric($value)) {
        return intval($value) === 1;
    }
    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ["1", "true", "yes", "on"], true)) {
            return true;
        }
        if (in_array($normalized, ["0", "false", "no", "off"], true)) {
            return false;
        }
    }
    return (bool) $default;
}

function djurbant_hvc_sanitize_text($value) {
    return sanitize_text_field(is_string($value) ? wp_unslash($value) : "");
}

function djurbant_hvc_sanitize_textarea($value) {
    return sanitize_textarea_field(is_string($value) ? wp_unslash($value) : "");
}

function djurbant_hvc_sanitize_link($value) {
    if (!is_string($value)) {
        return "";
    }
    $raw = trim(wp_unslash($value));
    if ($raw === "") {
        return "";
    }
    if (preg_match("/^\s*javascript:/i", $raw)) {
        return "";
    }
    if (preg_match("/^[a-z][a-z0-9+\-.]*:/i", $raw)) {
        return esc_url_raw($raw);
    }
    return sanitize_text_field($raw);
}

function djurbant_hvc_get_options() {
    $defaults = djurbant_hvc_default_schema();
    $stored = get_option(DJURBANT_HVC_OPTION_KEY, []);
    if (!is_array($stored)) {
        $stored = [];
    }
    return djurbant_hvc_deep_merge($defaults, $stored);
}

function djurbant_hvc_schema_to_options($schema) {
    $defaults = djurbant_hvc_default_schema();
    if (!is_array($schema)) {
        return $defaults;
    }
    return djurbant_hvc_deep_merge($defaults, $schema);
}

function djurbant_hvc_maybe_migrate_legacy_json() {
    if (get_option(DJURBANT_HVC_MIGRATION_FLAG, false)) {
        return;
    }

    $legacy = get_option(DJURBANT_HVC_LEGACY_JSON_OPTION_KEY, "");
    if (!is_string($legacy) || trim($legacy) === "") {
        update_option(DJURBANT_HVC_MIGRATION_FLAG, "no-legacy-found", false);
        return;
    }

    $decoded = json_decode($legacy, true);
    if (!is_array($decoded)) {
        update_option(DJURBANT_HVC_MIGRATION_FLAG, "legacy-invalid-json", false);
        return;
    }

    update_option(
        DJURBANT_HVC_OPTION_KEY,
        djurbant_hvc_schema_to_options($decoded),
        false
    );
    update_option(DJURBANT_HVC_MIGRATION_FLAG, "legacy-migrated", false);
}

function djurbant_hvc_sanitize_options($input) {
    $defaults = djurbant_hvc_default_schema();
    $out = $defaults;
    if (!is_array($input)) {
        return $out;
    }

    $text_fields = [
        "global.ctaDefaults.bookLabel",
        "global.meta.replySlaText",
        "pages.home.hero.tagline",
        "pages.home.bestOf.title",
        "pages.home.bookingBand.title",
        "pages.home.bookingBand.buttonLabel",
        "pages.video.title",
        "pages.video.intro",
        "pages.video.topButton.label",
        "pages.audio.title",
        "pages.audio.intro",
        "pages.audio.topButton.label",
        "pages.contact.title",
        "pages.contact.introText",
        "pages.contact.backButtonLabel",
        "pages.contact.submitButtonLabel",
    ];

    $link_fields = [
        "global.ctaDefaults.bookUrl",
        "pages.home.bookingBand.buttonUrl",
        "pages.video.topButton.url",
        "pages.audio.topButton.url",
        "pages.contact.formAction",
    ];

    $bool_fields = [
        "pages.home.sections.showStatsBand",
        "pages.home.sections.showBookingBand",
        "pages.home.sections.showSocialStrip",
        "pages.video.sections.showSocialStrip",
        "pages.audio.sections.showSocialStrip",
        "pages.contact.sections.showSocialStrip",
    ];

    foreach ($text_fields as $path) {
        $value = djurbant_hvc_get_path($input, $path, djurbant_hvc_get_path($defaults, $path, ""));
        djurbant_hvc_set_path($out, $path, djurbant_hvc_sanitize_textarea($value));
    }

    foreach ($link_fields as $path) {
        $value = djurbant_hvc_get_path($input, $path, djurbant_hvc_get_path($defaults, $path, ""));
        djurbant_hvc_set_path($out, $path, djurbant_hvc_sanitize_link($value));
    }

    foreach ($bool_fields as $path) {
        $default = djurbant_hvc_get_path($defaults, $path, false);
        $value = djurbant_hvc_get_path($input, $path, $default);
        djurbant_hvc_set_path($out, $path, djurbant_hvc_to_bool($value, $default));
    }

    $social_defaults = $defaults["global"]["socialLinks"];
    foreach ($social_defaults as $network_key => $network_defaults) {
        $label_path = "global.socialLinks.{$network_key}.label";
        $url_path = "global.socialLinks.{$network_key}.url";
        $new_tab_path = "global.socialLinks.{$network_key}.openInNewTab";
        $enabled_path = "global.socialLinks.{$network_key}.enabled";

        djurbant_hvc_set_path(
            $out,
            $label_path,
            djurbant_hvc_sanitize_text(
                djurbant_hvc_get_path($input, $label_path, $network_defaults["label"])
            )
        );
        djurbant_hvc_set_path(
            $out,
            $url_path,
            djurbant_hvc_sanitize_link(
                djurbant_hvc_get_path($input, $url_path, $network_defaults["url"])
            )
        );
        djurbant_hvc_set_path(
            $out,
            $new_tab_path,
            djurbant_hvc_to_bool(
                djurbant_hvc_get_path($input, $new_tab_path, $network_defaults["openInNewTab"]),
                $network_defaults["openInNewTab"]
            )
        );
        djurbant_hvc_set_path(
            $out,
            $enabled_path,
            djurbant_hvc_to_bool(
                djurbant_hvc_get_path($input, $enabled_path, $network_defaults["enabled"]),
                $network_defaults["enabled"]
            )
        );
    }

    return $out;
}

function djurbant_hvc_field_name($path) {
    $parts = explode(".", $path);
    $name = DJURBANT_HVC_OPTION_KEY;
    foreach ($parts as $part) {
        $name .= "[" . $part . "]";
    }
    return $name;
}

function djurbant_hvc_field_id($path) {
    return "djurbant_hvc_" . str_replace(".", "_", $path);
}

function djurbant_hvc_render_text_input($path, $value, $type = "text", $placeholder = "") {
    printf(
        '<input class="regular-text" type="%s" id="%s" name="%s" value="%s" placeholder="%s" />',
        esc_attr($type),
        esc_attr(djurbant_hvc_field_id($path)),
        esc_attr(djurbant_hvc_field_name($path)),
        esc_attr($value),
        esc_attr($placeholder)
    );
}

function djurbant_hvc_render_textarea($path, $value, $rows = 3) {
    printf(
        '<textarea class="large-text" rows="%d" id="%s" name="%s">%s</textarea>',
        intval($rows),
        esc_attr(djurbant_hvc_field_id($path)),
        esc_attr(djurbant_hvc_field_name($path)),
        esc_textarea($value)
    );
}

function djurbant_hvc_render_checkbox($path, $value) {
    $name = djurbant_hvc_field_name($path);
    $id = djurbant_hvc_field_id($path);
    echo '<input type="hidden" name="' . esc_attr($name) . '" value="0" />';
    printf(
        '<label><input type="checkbox" id="%s" name="%s" value="1" %s /> Enabled</label>',
        esc_attr($id),
        esc_attr($name),
        checked(true, (bool) $value, false)
    );
}

function djurbant_hvc_build_endpoint_payload($options) {
    $schema = djurbant_hvc_schema_to_options($options);
    return [
        "global" => [
            "ctaDefaults" => [
                "bookLabel" => strval(djurbant_hvc_get_path($schema, "global.ctaDefaults.bookLabel", "")),
                "bookUrl" => strval(djurbant_hvc_get_path($schema, "global.ctaDefaults.bookUrl", "")),
            ],
            "meta" => [
                "replySlaText" => strval(djurbant_hvc_get_path($schema, "global.meta.replySlaText", "")),
            ],
            "socialLinks" => djurbant_hvc_get_path($schema, "global.socialLinks", []),
        ],
        "pages" => [
            "home" => djurbant_hvc_get_path($schema, "pages.home", []),
            "video" => djurbant_hvc_get_path($schema, "pages.video", []),
            "audio" => djurbant_hvc_get_path($schema, "pages.audio", []),
            "contact" => djurbant_hvc_get_path($schema, "pages.contact", []),
        ],
    ];
}

function djurbant_hvc_register_settings() {
    register_setting(
        "djurbant_hvc_group",
        DJURBANT_HVC_OPTION_KEY,
        [
            "type" => "array",
            "sanitize_callback" => "djurbant_hvc_sanitize_options",
            "default" => djurbant_hvc_default_schema(),
        ]
    );
}
add_action("admin_init", "djurbant_hvc_maybe_migrate_legacy_json");
add_action("admin_init", "djurbant_hvc_register_settings");

function djurbant_hvc_render_section_header($title, $description = "") {
    echo '<h2 style="margin-top:28px;">' . esc_html($title) . "</h2>";
    if ($description !== "") {
        echo '<p style="max-width:920px;">' . esc_html($description) . "</p>";
    }
}

function djurbant_hvc_admin_page() {
    if (!current_user_can("manage_options")) {
        return;
    }
    $options = djurbant_hvc_get_options();
    $preview_payload = djurbant_hvc_build_endpoint_payload($options);
    $main_app_base_url = rtrim(
        strval(
            apply_filters(
                "djurbant_hvc_preview_base_url",
                "https://wordpress-1344959-6296666.cloudwaysapps.com"
            )
        ),
        "/"
    );
    $preview_asset_base = plugins_url("assets/previews/", __FILE__);
    $preview_cards = [
        [
            "title" => "Global CTAs + Socials",
            "description" => "Header CTA, footer social strip, and contact SLA copy.",
            "url" => $main_app_base_url . "/index.html",
            "image" => $preview_asset_base . "global-ctas-socials.png",
        ],
        [
            "title" => "Home — Hero + Best of",
            "description" => "Hero tagline and best-of section title/toggles.",
            "url" => $main_app_base_url . "/index.html#best-of-artist",
            "image" => $preview_asset_base . "home-hero-bestof.png",
        ],
        [
            "title" => "Home — Stats + Booking",
            "description" => "Stats/booking visibility and booking CTA content.",
            "url" => $main_app_base_url . "/index.html",
            "image" => $preview_asset_base . "home-stats-booking.png",
        ],
        [
            "title" => "Video page",
            "description" => "Video page title, intro, top button, social visibility.",
            "url" => $main_app_base_url . "/video.html",
            "image" => $preview_asset_base . "video-page.png",
        ],
        [
            "title" => "Audio page",
            "description" => "Audio page title, intro, top button, social visibility.",
            "url" => $main_app_base_url . "/audio.html",
            "image" => $preview_asset_base . "audio-page.png",
        ],
        [
            "title" => "Contact page",
            "description" => "Contact title, intro, form action, button labels.",
            "url" => $main_app_base_url . "/contact.html",
            "image" => $preview_asset_base . "contact-page.png",
        ],
    ];
    ?>
    <div class="wrap">
      <h1>DJ UrbanT — Visual Site Content CMS</h1>
      <p>Use this form-based editor for content and links. It powers <code>/wp-json/djurbant/v1/site-content</code>.</p>
      <section style="margin: 16px 0 22px;">
        <h2 style="margin: 0 0 8px;">Live section previews (main app)</h2>
        <p style="max-width: 980px; margin: 0 0 12px;">
          These previews help you map each CMS section to the live site area before saving.
        </p>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
          <?php foreach ($preview_cards as $card): ?>
            <article style="border:1px solid #ccd0d4;border-radius:8px;background:#fff;padding:10px;">
              <h3 style="margin:0 0 6px;font-size:14px;"><?php echo esc_html($card["title"]); ?></h3>
              <p style="margin:0 0 8px;color:#50575e;"><?php echo esc_html($card["description"]); ?></p>
              <div style="height:150px;border:1px solid #ccd0d4;border-radius:6px;overflow:hidden;background:#111;position:relative;">
                <img
                  loading="lazy"
                  src="<?php echo esc_url($card["image"]); ?>"
                  alt="<?php echo esc_attr($card["title"]); ?> preview"
                  style="width:100%;height:100%;object-fit:cover;display:block;"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                />
                <iframe
                  loading="lazy"
                  src="<?php echo esc_url($card["url"]); ?>"
                  title="<?php echo esc_attr($card["title"]); ?>"
                  style="display:none;width:1280px;height:720px;border:0;transform:scale(0.21);transform-origin:top left;"
                ></iframe>
              </div>
              <p style="margin:8px 0 0;">
                <a class="button button-secondary" href="<?php echo esc_url($card["url"]); ?>" target="_blank" rel="noopener noreferrer">Open live section</a>
              </p>
            </article>
          <?php endforeach; ?>
        </div>
      </section>
      <form method="post" action="options.php">
        <?php settings_fields("djurbant_hvc_group"); ?>

        <?php djurbant_hvc_render_section_header("Global", "Shared content used across Layer 1 pages."); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr>
              <th scope="row"><label for="<?php echo esc_attr(djurbant_hvc_field_id("global.ctaDefaults.bookLabel")); ?>">Book button label</label></th>
              <td><?php djurbant_hvc_render_text_input("global.ctaDefaults.bookLabel", djurbant_hvc_get_path($options, "global.ctaDefaults.bookLabel", "")); ?></td>
            </tr>
            <tr>
              <th scope="row"><label for="<?php echo esc_attr(djurbant_hvc_field_id("global.ctaDefaults.bookUrl")); ?>">Book button URL</label></th>
              <td><?php djurbant_hvc_render_text_input("global.ctaDefaults.bookUrl", djurbant_hvc_get_path($options, "global.ctaDefaults.bookUrl", ""), "text", "./contact.html"); ?></td>
            </tr>
            <tr>
              <th scope="row"><label for="<?php echo esc_attr(djurbant_hvc_field_id("global.meta.replySlaText")); ?>">Reply SLA text</label></th>
              <td><?php djurbant_hvc_render_text_input("global.meta.replySlaText", djurbant_hvc_get_path($options, "global.meta.replySlaText", "")); ?></td>
            </tr>
          </tbody>
        </table>

        <?php djurbant_hvc_render_section_header("Social links", "Edit each network URL, label, open-in-new-tab behavior, and visibility."); ?>
        <?php foreach (djurbant_hvc_get_path($options, "global.socialLinks", []) as $network_key => $network): ?>
          <h3 style="margin-top:20px;"><?php echo esc_html(ucfirst($network_key)); ?></h3>
          <table class="form-table" role="presentation">
            <tbody>
              <tr>
                <th scope="row">Label</th>
                <td><?php djurbant_hvc_render_text_input("global.socialLinks.{$network_key}.label", djurbant_hvc_get_path($options, "global.socialLinks.{$network_key}.label", "")); ?></td>
              </tr>
              <tr>
                <th scope="row">URL</th>
                <td><?php djurbant_hvc_render_text_input("global.socialLinks.{$network_key}.url", djurbant_hvc_get_path($options, "global.socialLinks.{$network_key}.url", ""), "text", "https://"); ?></td>
              </tr>
              <tr>
                <th scope="row">Open in new tab</th>
                <td><?php djurbant_hvc_render_checkbox("global.socialLinks.{$network_key}.openInNewTab", djurbant_hvc_get_path($options, "global.socialLinks.{$network_key}.openInNewTab", true)); ?></td>
              </tr>
              <tr>
                <th scope="row">Visible</th>
                <td><?php djurbant_hvc_render_checkbox("global.socialLinks.{$network_key}.enabled", djurbant_hvc_get_path($options, "global.socialLinks.{$network_key}.enabled", true)); ?></td>
              </tr>
            </tbody>
          </table>
        <?php endforeach; ?>

        <?php djurbant_hvc_render_section_header("Home page"); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Hero tagline</th><td><?php djurbant_hvc_render_text_input("pages.home.hero.tagline", djurbant_hvc_get_path($options, "pages.home.hero.tagline", "")); ?></td></tr>
            <tr><th scope="row">Best of title</th><td><?php djurbant_hvc_render_text_input("pages.home.bestOf.title", djurbant_hvc_get_path($options, "pages.home.bestOf.title", "")); ?></td></tr>
            <tr><th scope="row">Show stats band</th><td><?php djurbant_hvc_render_checkbox("pages.home.sections.showStatsBand", djurbant_hvc_get_path($options, "pages.home.sections.showStatsBand", true)); ?></td></tr>
            <tr><th scope="row">Show booking band</th><td><?php djurbant_hvc_render_checkbox("pages.home.sections.showBookingBand", djurbant_hvc_get_path($options, "pages.home.sections.showBookingBand", true)); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.home.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.home.sections.showSocialStrip", true)); ?></td></tr>
            <tr><th scope="row">Booking band title</th><td><?php djurbant_hvc_render_text_input("pages.home.bookingBand.title", djurbant_hvc_get_path($options, "pages.home.bookingBand.title", "")); ?></td></tr>
            <tr><th scope="row">Booking button label</th><td><?php djurbant_hvc_render_text_input("pages.home.bookingBand.buttonLabel", djurbant_hvc_get_path($options, "pages.home.bookingBand.buttonLabel", "")); ?></td></tr>
            <tr><th scope="row">Booking button URL</th><td><?php djurbant_hvc_render_text_input("pages.home.bookingBand.buttonUrl", djurbant_hvc_get_path($options, "pages.home.bookingBand.buttonUrl", ""), "text", "./contact.html"); ?></td></tr>
          </tbody>
        </table>

        <?php djurbant_hvc_render_section_header("Video page"); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Title</th><td><?php djurbant_hvc_render_text_input("pages.video.title", djurbant_hvc_get_path($options, "pages.video.title", "")); ?></td></tr>
            <tr><th scope="row">Intro text</th><td><?php djurbant_hvc_render_textarea("pages.video.intro", djurbant_hvc_get_path($options, "pages.video.intro", ""), 3); ?></td></tr>
            <tr><th scope="row">Top button label</th><td><?php djurbant_hvc_render_text_input("pages.video.topButton.label", djurbant_hvc_get_path($options, "pages.video.topButton.label", "")); ?></td></tr>
            <tr><th scope="row">Top button URL</th><td><?php djurbant_hvc_render_text_input("pages.video.topButton.url", djurbant_hvc_get_path($options, "pages.video.topButton.url", ""), "text", "./index.html?bestOf=video#best-of-artist"); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.video.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.video.sections.showSocialStrip", true)); ?></td></tr>
          </tbody>
        </table>

        <?php djurbant_hvc_render_section_header("Audio page"); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Title</th><td><?php djurbant_hvc_render_text_input("pages.audio.title", djurbant_hvc_get_path($options, "pages.audio.title", "")); ?></td></tr>
            <tr><th scope="row">Intro text</th><td><?php djurbant_hvc_render_textarea("pages.audio.intro", djurbant_hvc_get_path($options, "pages.audio.intro", ""), 3); ?></td></tr>
            <tr><th scope="row">Top button label</th><td><?php djurbant_hvc_render_text_input("pages.audio.topButton.label", djurbant_hvc_get_path($options, "pages.audio.topButton.label", "")); ?></td></tr>
            <tr><th scope="row">Top button URL</th><td><?php djurbant_hvc_render_text_input("pages.audio.topButton.url", djurbant_hvc_get_path($options, "pages.audio.topButton.url", ""), "text", "./index.html?bestOf=audio#best-of-artist"); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.audio.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.audio.sections.showSocialStrip", true)); ?></td></tr>
          </tbody>
        </table>

        <?php djurbant_hvc_render_section_header("Contact page"); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Title</th><td><?php djurbant_hvc_render_text_input("pages.contact.title", djurbant_hvc_get_path($options, "pages.contact.title", "")); ?></td></tr>
            <tr><th scope="row">Intro text</th><td><?php djurbant_hvc_render_textarea("pages.contact.introText", djurbant_hvc_get_path($options, "pages.contact.introText", ""), 3); ?></td></tr>
            <tr><th scope="row">Form action</th><td><?php djurbant_hvc_render_text_input("pages.contact.formAction", djurbant_hvc_get_path($options, "pages.contact.formAction", ""), "text", "mailto:booking@djurbant.com"); ?></td></tr>
            <tr><th scope="row">Back button label</th><td><?php djurbant_hvc_render_text_input("pages.contact.backButtonLabel", djurbant_hvc_get_path($options, "pages.contact.backButtonLabel", "")); ?></td></tr>
            <tr><th scope="row">Submit button label</th><td><?php djurbant_hvc_render_text_input("pages.contact.submitButtonLabel", djurbant_hvc_get_path($options, "pages.contact.submitButtonLabel", "")); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.contact.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.contact.sections.showSocialStrip", true)); ?></td></tr>
          </tbody>
        </table>

        <?php submit_button("Save Content"); ?>
      </form>

      <h2>Endpoint preview</h2>
      <p>This preview mirrors what the headless endpoint returns to your sync workflow.</p>
      <pre style="max-height:420px;overflow:auto;background:#fff;border:1px solid #ccd0d4;padding:12px;"><?php echo esc_html(wp_json_encode($preview_payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); ?></pre>
      <p><strong>Endpoint:</strong> <code><?php echo esc_html(rest_url("djurbant/v1/site-content")); ?></code></p>
    </div>
    <?php
}

function djurbant_hvc_add_admin_menu() {
    add_menu_page(
        "DJ UrbanT Content CMS",
        "Site Content CMS",
        "manage_options",
        "djurbant-headless-visual-cms",
        "djurbant_hvc_admin_page",
        "dashicons-edit-page",
        81
    );
}
add_action("admin_menu", "djurbant_hvc_add_admin_menu");

function djurbant_hvc_register_rest_route() {
    register_rest_route(
        "djurbant/v1",
        "/site-content",
        [
            "methods" => "GET",
            "permission_callback" => "__return_true",
            "callback" => function () {
                $payload = djurbant_hvc_build_endpoint_payload(djurbant_hvc_get_options());
                return rest_ensure_response($payload);
            },
        ]
    );
}
add_action("rest_api_init", "djurbant_hvc_register_rest_route");
