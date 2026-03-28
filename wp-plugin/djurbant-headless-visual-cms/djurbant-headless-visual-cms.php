<?php
/*
Plugin Name: DJ UrbanT Headless Visual CMS
Description: Visual editor for DJ UrbanT site content with headless endpoint mapper at /wp-json/djurbant/v1/site-content.
Version: 1.4.0
*/

if (!defined("ABSPATH")) {
    exit;
}

const DJURBANT_HVC_OPTION_KEY = "djurbant_hvc_options";
const DJURBANT_HVC_MIGRATION_FLAG = "djurbant_hvc_migrated_from_legacy_json";
const DJURBANT_HVC_LEGACY_JSON_OPTION_KEY = "djurbant_site_content_json";
const DJURBANT_HVC_LAST_WP_SAVE_OPTION_KEY = "djurbant_hvc_last_wp_save_at";

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

    // Store the latest WP-side save time for operator confidence.
    update_option(DJURBANT_HVC_LAST_WP_SAVE_OPTION_KEY, time(), false);
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

function djurbant_hvc_field_meta($path) {
    $module = "global";
    if (strpos($path, "global.socialLinks.") === 0) {
        $module = "social";
    } elseif (strpos($path, "pages.home.") === 0) {
        $module = "home";
    } elseif (strpos($path, "pages.video.") === 0) {
        $module = "video";
    } elseif (strpos($path, "pages.audio.") === 0) {
        $module = "audio";
    } elseif (strpos($path, "pages.contact.") === 0) {
        $module = "contact";
    }

    $required_paths = [
        "global.ctaDefaults.bookLabel",
        "global.ctaDefaults.bookUrl",
        "pages.home.hero.tagline",
        "pages.home.bestOf.title",
        "pages.home.bookingBand.title",
        "pages.home.bookingBand.buttonLabel",
        "pages.home.bookingBand.buttonUrl",
        "pages.video.title",
        "pages.video.intro",
        "pages.video.topButton.label",
        "pages.video.topButton.url",
        "pages.audio.title",
        "pages.audio.intro",
        "pages.audio.topButton.label",
        "pages.audio.topButton.url",
        "pages.contact.title",
        "pages.contact.introText",
        "pages.contact.formAction",
    ];
    $recommended_paths = [
        "global.meta.replySlaText",
        "pages.contact.backButtonLabel",
        "pages.contact.submitButtonLabel",
    ];
    $is_social_url = preg_match(
        "/^global\\.socialLinks\\.[^.]+\\.url$/",
        $path
    ) === 1;
    $validate = "";
    if (
        in_array($path, [
            "global.ctaDefaults.bookUrl",
            "pages.home.bookingBand.buttonUrl",
            "pages.video.topButton.url",
            "pages.audio.topButton.url",
            "pages.contact.formAction",
        ], true) ||
        $is_social_url
    ) {
        $validate = "url_or_path";
    }

    return [
        "module" => $module,
        "required" => in_array($path, $required_paths, true),
        "recommended" => in_array($path, $recommended_paths, true),
        "validate" => $validate,
    ];
}

function djurbant_hvc_render_text_input($path, $value, $type = "text", $placeholder = "") {
    $meta = djurbant_hvc_field_meta($path);
    printf(
        '<input class="regular-text djurbant-hvc-input" type="%s" id="%s" name="%s" value="%s" placeholder="%s" data-field-path="%s" data-module="%s" data-required="%s" data-recommended="%s" data-validate="%s" />',
        esc_attr($type),
        esc_attr(djurbant_hvc_field_id($path)),
        esc_attr(djurbant_hvc_field_name($path)),
        esc_attr($value),
        esc_attr($placeholder),
        esc_attr($path),
        esc_attr(strval($meta["module"])),
        $meta["required"] ? "1" : "0",
        $meta["recommended"] ? "1" : "0",
        esc_attr(strval($meta["validate"]))
    );
}

function djurbant_hvc_render_textarea($path, $value, $rows = 3) {
    $meta = djurbant_hvc_field_meta($path);
    printf(
        '<textarea class="large-text djurbant-hvc-input" rows="%d" id="%s" name="%s" data-field-path="%s" data-module="%s" data-required="%s" data-recommended="%s" data-validate="%s">%s</textarea>',
        intval($rows),
        esc_attr(djurbant_hvc_field_id($path)),
        esc_attr(djurbant_hvc_field_name($path)),
        esc_attr($path),
        esc_attr(strval($meta["module"])),
        $meta["required"] ? "1" : "0",
        $meta["recommended"] ? "1" : "0",
        esc_attr(strval($meta["validate"])),
        esc_textarea($value)
    );
}

function djurbant_hvc_render_checkbox($path, $value) {
    $meta = djurbant_hvc_field_meta($path);
    $name = djurbant_hvc_field_name($path);
    $id = djurbant_hvc_field_id($path);
    echo '<input type="hidden" name="' . esc_attr($name) . '" value="0" />';
    printf(
        '<label><input class="djurbant-hvc-input" type="checkbox" id="%s" name="%s" value="1" data-field-path="%s" data-module="%s" data-required="%s" data-recommended="%s" data-validate="%s" %s /> Enabled</label>',
        esc_attr($id),
        esc_attr($name),
        esc_attr($path),
        esc_attr(strval($meta["module"])),
        $meta["required"] ? "1" : "0",
        $meta["recommended"] ? "1" : "0",
        esc_attr(strval($meta["validate"])),
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

function djurbant_hvc_get_preview_cards($main_app_base_url, $preview_asset_base) {
    return [
        "global" => [
            "title" => "Global CTAs + Socials",
            "description" => "Header CTA, footer social strip, and contact SLA copy.",
            "url" => $main_app_base_url . "/index.html",
            "image" => $preview_asset_base . "global-ctas-socials.png",
        ],
        "social" => [
            "title" => "Social links",
            "description" => "Footer social strip labels, URLs, and visibility.",
            "url" => $main_app_base_url . "/index.html",
            "image" => $preview_asset_base . "global-ctas-socials.png",
        ],
        "home" => [
            "title" => "Home — Hero + Best of",
            "description" => "Hero tagline and best-of section title/toggles.",
            "url" => $main_app_base_url . "/index.html#best-of-artist",
            "image" => $preview_asset_base . "home-hero-bestof.png",
        ],
        "video" => [
            "title" => "Video page",
            "description" => "Video page title, intro, top button, social visibility.",
            "url" => $main_app_base_url . "/video.html",
            "image" => $preview_asset_base . "video-page.png",
        ],
        "audio" => [
            "title" => "Audio page",
            "description" => "Audio page title, intro, top button, social visibility.",
            "url" => $main_app_base_url . "/audio.html",
            "image" => $preview_asset_base . "audio-page.png",
        ],
        "contact" => [
            "title" => "Contact page",
            "description" => "Contact title, intro, form action, button labels.",
            "url" => $main_app_base_url . "/contact.html",
            "image" => $preview_asset_base . "contact-page.png",
        ],
        "home_stats_booking" => [
            "title" => "Home — Stats + Booking",
            "description" => "Stats/booking visibility and booking CTA content.",
            "url" => $main_app_base_url . "/index.html",
            "image" => $preview_asset_base . "home-stats-booking.png",
        ],
    ];
}

function djurbant_hvc_get_preview_card_meta($card, $preview_dir) {
    $image_url = is_array($card) ? strval($card["image"] ?? "") : "";
    $image_file = $image_url !== "" ? basename($image_url) : "";
    $image_path = $image_file !== "" ? $preview_dir . $image_file : "";
    $exists = $image_path !== "" && file_exists($image_path);
    $mtime = $exists ? intval(filemtime($image_path)) : 0;
    return [
        "exists" => $exists,
        "mtime" => $mtime,
        "label" => $mtime > 0 ? wp_date("Y-m-d H:i T", $mtime) : "n/a",
    ];
}

function djurbant_hvc_get_module_presets($module_key) {
    $module_key = strtolower(trim(strval($module_key)));
    $presets = [
        "global" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "global_default", "label" => "Default CTA + reply"],
        ],
        "social" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "social_enable_all", "label" => "Enable all socials"],
            ["value" => "social_disable_all", "label" => "Disable all socials"],
        ],
        "home" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "home_rainbow_default", "label" => "Rainbow home baseline"],
        ],
        "video" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "video_default", "label" => "Video ranked baseline"],
        ],
        "audio" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "audio_default", "label" => "Audio ranked baseline"],
        ],
        "contact" => [
            ["value" => "", "label" => "No preset"],
            ["value" => "contact_default", "label" => "Contact booking baseline"],
        ],
    ];
    return $presets[$module_key] ?? [["value" => "", "label" => "No preset"]];
}

function djurbant_hvc_render_section_with_preview_start($module_key, $module_index, $title, $description = "") {
    $presets = djurbant_hvc_get_module_presets($module_key);
    ?>
    <details class="djurbant-hvc-module" open data-module-key="<?php echo esc_attr($module_key); ?>">
      <summary class="djurbant-hvc-module-summary">
        <span class="djurbant-hvc-module-index"><?php echo esc_html(strval($module_index)); ?></span>
        <span class="djurbant-hvc-module-title"><?php echo esc_html($title); ?></span>
        <span class="djurbant-hvc-module-status is-live" data-module-status>Live</span>
      </summary>
      <section class="djurbant-hvc-section">
        <div class="djurbant-hvc-section-fields">
        <?php if ($description !== ""): ?>
          <p style="max-width:920px;"><?php echo esc_html($description); ?></p>
        <?php endif; ?>
        <div class="djurbant-hvc-module-tools">
          <label>
            <span>Quick preset</span>
            <select class="djurbant-hvc-preset-select" data-module-key="<?php echo esc_attr($module_key); ?>">
              <?php foreach ($presets as $preset): ?>
                <option value="<?php echo esc_attr(strval($preset["value"])); ?>">
                  <?php echo esc_html(strval($preset["label"])); ?>
                </option>
              <?php endforeach; ?>
            </select>
          </label>
          <button
            type="button"
            class="button button-secondary djurbant-hvc-apply-preset"
            data-module-key="<?php echo esc_attr($module_key); ?>"
          >
            Apply preset
          </button>
        </div>
        <p class="djurbant-hvc-module-note">Status updates while you edit this section.</p>
        <div class="djurbant-hvc-validation-summary" data-module-validation-summary>All checks passed</div>
    <?php
}

function djurbant_hvc_render_section_with_preview_end($card, $preview_dir) {
    $card_title = is_array($card) ? strval($card["title"] ?? "Section preview") : "Section preview";
    $card_description = is_array($card) ? strval($card["description"] ?? "") : "";
    $card_url = is_array($card) ? strval($card["url"] ?? "") : "";
    $card_image = is_array($card) ? strval($card["image"] ?? "") : "";
    $meta = djurbant_hvc_get_preview_card_meta($card, $preview_dir);
    ?>
      </div>
      <aside class="djurbant-hvc-section-preview">
        <h3><?php echo esc_html($card_title); ?></h3>
        <?php if ($card_description !== ""): ?>
          <p class="djurbant-hvc-section-preview-description"><?php echo esc_html($card_description); ?></p>
        <?php endif; ?>
        <div class="djurbant-hvc-section-preview-media">
          <?php if ($meta["exists"]): ?>
            <img
              loading="lazy"
              src="<?php echo esc_url($card_image); ?>"
              alt="<?php echo esc_attr($card_title); ?> screenshot"
            />
          <?php else: ?>
            <div class="djurbant-hvc-section-preview-fallback">
              <p>Screenshot unavailable</p>
              <span>Run the “Refresh CMS Preview Screens” workflow.</span>
            </div>
          <?php endif; ?>
        </div>
        <p class="djurbant-hvc-section-preview-meta">
          <strong>Last screenshot refresh:</strong> <?php echo esc_html($meta["label"]); ?>
        </p>
        <?php if ($card_url !== ""): ?>
          <p style="margin:0;">
            <a
              class="button button-secondary"
              href="<?php echo esc_url($card_url); ?>"
              target="_blank"
              rel="noopener noreferrer"
            >Open live section</a>
          </p>
        <?php endif; ?>
      </aside>
      </section>
    </details>
    <?php
}

function djurbant_hvc_fetch_last_sync_run() {
    $cached = get_transient("djurbant_hvc_last_sync_run");
    if (is_array($cached) && isset($cached["statusLabel"])) {
        return $cached;
    }

    $repo = trim(
        strval(
            apply_filters("djurbant_hvc_github_repo", "tigges/Fresh-video-wall")
        )
    );
    $workflow_file = trim(
        strval(
            apply_filters(
                "djurbant_hvc_sync_workflow_file",
                "sync-site-content-from-wp.yml"
            )
        )
    );

    if (
        !preg_match("/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/", $repo) ||
        $workflow_file === ""
    ) {
        return [
            "statusLabel" => "Unavailable",
            "detailLabel" => "Invalid GitHub repo/workflow configuration.",
            "updatedLabel" => "n/a",
            "htmlUrl" => "",
        ];
    }

    [$owner, $name] = explode("/", $repo, 2);
    $api_url =
        "https://api.github.com/repos/" .
        rawurlencode($owner) .
        "/" .
        rawurlencode($name) .
        "/actions/workflows/" .
        rawurlencode($workflow_file) .
        "/runs?per_page=1";

    $response = wp_remote_get($api_url, [
        "timeout" => 8,
        "headers" => [
            "Accept" => "application/vnd.github+json",
            "User-Agent" => "DJ-UrbanT-HVC/1.1",
        ],
    ]);

    if (is_wp_error($response)) {
        return [
            "statusLabel" => "Unavailable",
            "detailLabel" => "GitHub API request failed.",
            "updatedLabel" => "n/a",
            "htmlUrl" => "",
        ];
    }

    $status_code = wp_remote_retrieve_response_code($response);
    if ($status_code !== 200) {
        return [
            "statusLabel" => "Unavailable",
            "detailLabel" => "GitHub API returned HTTP " . intval($status_code) . ".",
            "updatedLabel" => "n/a",
            "htmlUrl" => "",
        ];
    }

    $body = json_decode(strval(wp_remote_retrieve_body($response)), true);
    $runs = is_array($body) ? ($body["workflow_runs"] ?? []) : [];
    $run = is_array($runs) && !empty($runs) && is_array($runs[0]) ? $runs[0] : null;
    if (!is_array($run)) {
        return [
            "statusLabel" => "Unavailable",
            "detailLabel" => "No workflow runs found yet.",
            "updatedLabel" => "n/a",
            "htmlUrl" => "",
        ];
    }

    $status = strtolower(strval($run["status"] ?? ""));
    $conclusion = strtolower(strval($run["conclusion"] ?? ""));
    $status_label = "Unknown";
    $detail_label = "Status unknown";

    if ($status !== "completed") {
        $status_label = "In progress";
        $detail_label = "Current status: " . $status;
    } elseif ($conclusion === "success") {
        $status_label = "Success";
        $detail_label = "Latest sync run completed successfully.";
    } elseif ($conclusion !== "") {
        $status_label = "Failed";
        $detail_label = "Latest sync run concluded: " . $conclusion . ".";
    }

    $updated_at = strval($run["updated_at"] ?? "");
    $updated_ts = $updated_at !== "" ? strtotime($updated_at) : false;
    $updated_label = $updated_ts ? wp_date("Y-m-d H:i T", intval($updated_ts)) : "n/a";

    $result = [
        "statusLabel" => $status_label,
        "detailLabel" => $detail_label,
        "updatedLabel" => $updated_label,
        "htmlUrl" => strval($run["html_url"] ?? ""),
    ];
    set_transient("djurbant_hvc_last_sync_run", $result, 300);
    return $result;
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
    $github_repo = trim(
        strval(apply_filters("djurbant_hvc_github_repo", "tigges/Fresh-video-wall"))
    );
    $sync_workflow_url =
        "https://github.com/" .
        rawurlencode($github_repo) .
        "/actions/workflows/sync-site-content-from-wp.yml";
    $sync_runs_url = $sync_workflow_url . "?query=branch%3Amain";
    $sync_run = djurbant_hvc_fetch_last_sync_run();
    $last_wp_save_ts = intval(
        get_option(DJURBANT_HVC_LAST_WP_SAVE_OPTION_KEY, 0)
    );
    $last_wp_save_label = $last_wp_save_ts > 0
        ? wp_date("Y-m-d H:i T", $last_wp_save_ts)
        : "n/a";
    $preview_asset_base = plugins_url("assets/previews/", __FILE__);
    $preview_cards = djurbant_hvc_get_preview_cards(
        $main_app_base_url,
        $preview_asset_base
    );
    $preview_dir = plugin_dir_path(__FILE__) . "assets/previews/";
    $latest_preview_mtime = 0;
    foreach ($preview_cards as $card) {
        $image_file = basename(strval($card["image"]));
        $image_path = $preview_dir . $image_file;
        if (file_exists($image_path)) {
            $mtime = intval(filemtime($image_path));
            if ($mtime > $latest_preview_mtime) {
                $latest_preview_mtime = $mtime;
            }
        }
    }
    $latest_preview_label = $latest_preview_mtime > 0
        ? wp_date("Y-m-d H:i T", $latest_preview_mtime)
        : "n/a";
    ?>
    <div class="wrap">
      <h1>DJ UrbanT — Visual Site Content CMS</h1>
      <p>Use this form-based editor for content and links. It powers <code>/wp-json/djurbant/v1/site-content</code>.</p>
      <section style="margin: 16px 0 20px; border: 1px solid #ccd0d4; border-radius: 8px; background: #fff; padding: 12px;">
        <h2 style="margin: 0 0 8px;">Publish confidence panel</h2>
        <p style="margin: 0 0 10px; max-width: 980px;">
          Operator flow: save in WordPress, run content sync workflow, then verify on live site.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px;">
          <span class="button button-secondary" style="pointer-events:none;cursor:default;"><strong>Last WP save:</strong>&nbsp;<?php echo esc_html($last_wp_save_label); ?></span>
          <span class="button button-secondary" style="pointer-events:none;cursor:default;"><strong>Last sync run:</strong>&nbsp;<?php echo esc_html($sync_run["statusLabel"]); ?></span>
          <span class="button button-secondary" style="pointer-events:none;cursor:default;"><strong>Sync updated:</strong>&nbsp;<?php echo esc_html($sync_run["updatedLabel"]); ?></span>
        </div>
        <p style="margin: 0 0 10px; color: #50575e;">
          <?php echo esc_html($sync_run["detailLabel"]); ?>
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <a class="button button-primary" href="<?php echo esc_url($sync_workflow_url); ?>" target="_blank" rel="noopener noreferrer">Open Sync Workflow</a>
          <a class="button button-secondary" href="<?php echo esc_url($sync_runs_url); ?>" target="_blank" rel="noopener noreferrer">View Workflow Runs</a>
          <a class="button button-secondary" href="<?php echo esc_url(rest_url("djurbant/v1/site-content")); ?>" target="_blank" rel="noopener noreferrer">Open Endpoint JSON</a>
          <a class="button button-secondary" href="<?php echo esc_url($main_app_base_url . "/cms/"); ?>" target="_blank" rel="noopener noreferrer">Open Main App CMS Hub</a>
          <?php if (strval($sync_run["htmlUrl"]) !== ""): ?>
            <a class="button button-secondary" href="<?php echo esc_url($sync_run["htmlUrl"]); ?>" target="_blank" rel="noopener noreferrer">Open Latest Sync Run</a>
          <?php endif; ?>
        </div>
      </section>
      <section style="margin: 16px 0 22px;">
        <h2 style="margin: 0 0 8px;">Live section previews (main app)</h2>
        <p style="max-width: 980px; margin: 0 0 12px;">
          These previews help you map each CMS section to the live site area before saving.
        </p>
        <p style="margin: 0 0 10px; color: #50575e;">
          <strong>Last screenshot refresh:</strong> <?php echo esc_html($latest_preview_label); ?>
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
      <style>
        .djurbant-hvc-top-actions {
          position: sticky;
          top: 32px;
          z-index: 12;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin: 14px 0;
          border: 1px solid #ccd0d4;
          border-radius: 8px;
          background: #fff;
          padding: 10px;
        }

        .djurbant-hvc-top-actions-left,
        .djurbant-hvc-top-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .djurbant-hvc-section-module {
          margin: 16px 0;
          border: 1px solid #ccd0d4;
          border-radius: 10px;
          background: #fff;
          overflow: hidden;
        }

        .djurbant-hvc-section-module > summary {
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid #e5e5e5;
          font-weight: 600;
          user-select: none;
        }

        .djurbant-hvc-section-module > summary::-webkit-details-marker {
          display: none;
        }

        .djurbant-hvc-section-module-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .djurbant-hvc-module-index {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 1px solid #d0d4d8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #50575e;
        }

        .djurbant-hvc-module-right {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .djurbant-hvc-status-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          line-height: 1.3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        .djurbant-hvc-status-live {
          background: #ecf8ee;
          border-color: #9fd3a7;
          color: #1e6b2f;
        }

        .djurbant-hvc-status-warning {
          background: #fff8e5;
          border-color: #e6cf7b;
          color: #7a5500;
        }

        .djurbant-hvc-status-error {
          background: #fef0ef;
          border-color: #e6a39f;
          color: #8a1f17;
        }

        .djurbant-hvc-status-auto {
          background: #edf4ff;
          border-color: #a8c1f0;
          color: #1d4f9f;
        }

        .djurbant-hvc-validation-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 10px 0 4px;
        }

        .djurbant-hvc-module-note {
          margin: 0 0 8px;
          color: #50575e;
          font-size: 12px;
        }

        .djurbant-hvc-field-error {
          border-color: #d63638 !important;
          box-shadow: 0 0 0 1px rgba(214, 54, 56, 0.15) !important;
        }

        .djurbant-hvc-field-warning {
          border-color: #b88900 !important;
          box-shadow: 0 0 0 1px rgba(184, 137, 0, 0.12) !important;
        }

        .djurbant-hvc-presets-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 2px 0 10px;
        }

        .djurbant-hvc-preset {
          border: 1px solid #ccd0d4;
          border-radius: 999px;
          background: #f6f7f7;
          padding: 2px 8px;
          font-size: 11px;
          line-height: 1.4;
          cursor: pointer;
        }

        .djurbant-hvc-preset:hover {
          background: #eef1f3;
        }

        .djurbant-hvc-sticky-submit {
          position: sticky;
          bottom: 0;
          z-index: 11;
          margin-top: 12px;
          border: 1px solid #ccd0d4;
          border-radius: 8px;
          background: #fff;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .djurbant-hvc-builder-hidden {
          display: none !important;
        }

        .djurbant-hvc-section {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 16px;
          margin: 18px 0;
          border: 1px solid #ccd0d4;
          border-radius: 8px;
          background: #fff;
          padding: 12px;
        }

        .djurbant-hvc-section h2 {
          margin-top: 0;
        }

        .djurbant-hvc-section-fields .form-table {
          margin-top: 8px;
        }

        .djurbant-hvc-section-preview {
          border-left: 1px solid #e5e5e5;
          padding-left: 12px;
        }

        .djurbant-hvc-section-preview h3 {
          margin: 0 0 6px;
          font-size: 13px;
        }

        .djurbant-hvc-section-preview-description {
          margin: 0 0 8px;
          color: #50575e;
          font-size: 12px;
          line-height: 1.4;
        }

        .djurbant-hvc-section-preview-media {
          height: 160px;
          border: 1px solid #ccd0d4;
          border-radius: 6px;
          overflow: hidden;
          background: #111;
          margin-bottom: 8px;
        }

        .djurbant-hvc-section-preview-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .djurbant-hvc-section-preview-fallback {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 8px;
          text-align: center;
          color: #dcdcde;
          background: linear-gradient(140deg, #2c3338, #1d2327);
        }

        .djurbant-hvc-section-preview-fallback p {
          margin: 0 0 4px;
          font-weight: 600;
        }

        .djurbant-hvc-section-preview-fallback span {
          font-size: 11px;
          opacity: 0.9;
        }

        .djurbant-hvc-section-preview-meta {
          margin: 0 0 8px;
          font-size: 12px;
          color: #50575e;
        }

        @media (max-width: 1100px) {
          .djurbant-hvc-section {
            grid-template-columns: 1fr;
          }

          .djurbant-hvc-section-preview {
            border-left: 0;
            border-top: 1px solid #e5e5e5;
            padding-left: 0;
            padding-top: 12px;
          }
        }
      </style>
      <form method="post" action="options.php">
        <?php settings_fields("djurbant_hvc_group"); ?>

        <div class="djurbant-hvc-top-actions">
          <div class="djurbant-hvc-top-actions-left">
            <button type="button" class="button button-secondary" id="djurbant-hvc-expand-all">Expand all</button>
            <button type="button" class="button button-secondary" id="djurbant-hvc-collapse-all">Collapse all</button>
            <div class="djurbant-hvc-validation-summary">
              <span class="djurbant-hvc-status-badge djurbant-hvc-status-live" id="djurbant-hvc-summary-live">Live: 0</span>
              <span class="djurbant-hvc-status-badge djurbant-hvc-status-warning" id="djurbant-hvc-summary-warning">Warnings: 0</span>
              <span class="djurbant-hvc-status-badge djurbant-hvc-status-error" id="djurbant-hvc-summary-error">Errors: 0</span>
            </div>
          </div>
          <div class="djurbant-hvc-top-actions-right">
            <a class="button button-secondary" href="<?php echo esc_url($main_app_base_url . "/cms/visual.html"); ?>" target="_blank" rel="noopener noreferrer">Preview launcher</a>
            <a class="button button-primary" href="<?php echo esc_url($main_app_base_url . "/index.html"); ?>" target="_blank" rel="noopener noreferrer">Preview site</a>
          </div>
        </div>

        <?php djurbant_hvc_render_section_with_preview_start("global", 1, "Navigation", "Shared nav CTA defaults and global response copy."); ?>
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
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["global"], $preview_dir); ?>

        <?php djurbant_hvc_render_section_with_preview_start("social", 2, "Hero + Social presence", "Hero-level social visibility and external network links."); ?>
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
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["social"], $preview_dir); ?>

        <?php djurbant_hvc_render_section_with_preview_start("home", 3, "Video & audio carousel", "Best-of section title and home booking/stats visibility."); ?>
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
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["home"], $preview_dir); ?>

        <?php djurbant_hvc_render_section_with_preview_start("video", 4, "Stats strip + video page", "Video subpage text, CTA, and social strip behavior."); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Title</th><td><?php djurbant_hvc_render_text_input("pages.video.title", djurbant_hvc_get_path($options, "pages.video.title", "")); ?></td></tr>
            <tr><th scope="row">Intro text</th><td><?php djurbant_hvc_render_textarea("pages.video.intro", djurbant_hvc_get_path($options, "pages.video.intro", ""), 3); ?></td></tr>
            <tr><th scope="row">Top button label</th><td><?php djurbant_hvc_render_text_input("pages.video.topButton.label", djurbant_hvc_get_path($options, "pages.video.topButton.label", "")); ?></td></tr>
            <tr><th scope="row">Top button URL</th><td><?php djurbant_hvc_render_text_input("pages.video.topButton.url", djurbant_hvc_get_path($options, "pages.video.topButton.url", ""), "text", "./index.html?bestOf=video#best-of-artist"); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.video.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.video.sections.showSocialStrip", true)); ?></td></tr>
          </tbody>
        </table>
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["video"], $preview_dir); ?>

        <?php djurbant_hvc_render_section_with_preview_start("audio", 5, "Booking CTA + audio page", "Audio subpage text, CTA, and social strip behavior."); ?>
        <table class="form-table" role="presentation">
          <tbody>
            <tr><th scope="row">Title</th><td><?php djurbant_hvc_render_text_input("pages.audio.title", djurbant_hvc_get_path($options, "pages.audio.title", "")); ?></td></tr>
            <tr><th scope="row">Intro text</th><td><?php djurbant_hvc_render_textarea("pages.audio.intro", djurbant_hvc_get_path($options, "pages.audio.intro", ""), 3); ?></td></tr>
            <tr><th scope="row">Top button label</th><td><?php djurbant_hvc_render_text_input("pages.audio.topButton.label", djurbant_hvc_get_path($options, "pages.audio.topButton.label", "")); ?></td></tr>
            <tr><th scope="row">Top button URL</th><td><?php djurbant_hvc_render_text_input("pages.audio.topButton.url", djurbant_hvc_get_path($options, "pages.audio.topButton.url", ""), "text", "./index.html?bestOf=audio#best-of-artist"); ?></td></tr>
            <tr><th scope="row">Show social strip</th><td><?php djurbant_hvc_render_checkbox("pages.audio.sections.showSocialStrip", djurbant_hvc_get_path($options, "pages.audio.sections.showSocialStrip", true)); ?></td></tr>
          </tbody>
        </table>
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["audio"], $preview_dir); ?>

        <?php djurbant_hvc_render_section_with_preview_start("contact", 6, "Footer + contact", "Contact form labels/action and footer social visibility."); ?>
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
        <?php djurbant_hvc_render_section_with_preview_end($preview_cards["contact"], $preview_dir); ?>

        <div class="djurbant-hvc-sticky-submit">
          <?php submit_button("Publish changes", "primary", "submit", false); ?>
        </div>
      </form>

      <h2>Endpoint preview</h2>
      <p>This preview mirrors what the headless endpoint returns to your sync workflow.</p>
      <pre style="max-height:420px;overflow:auto;background:#fff;border:1px solid #ccd0d4;padding:12px;"><?php echo esc_html(wp_json_encode($preview_payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); ?></pre>
      <p><strong>Endpoint:</strong> <code><?php echo esc_html(rest_url("djurbant/v1/site-content")); ?></code></p>
      <p><strong>WP route:</strong> <code>/visual-cms</code> (short URL redirect)</p>
      <script>
        (() => {
          const form = document.querySelector('form[action="options.php"]');
          if (!form) return;
          const modules = Array.from(document.querySelectorAll(".djurbant-hvc-module"));
          const inputs = Array.from(form.querySelectorAll(".djurbant-hvc-input"));
          const expandAllBtn = document.getElementById("djurbant-hvc-expand-all");
          const collapseAllBtn = document.getElementById("djurbant-hvc-collapse-all");
          const summaryLive = document.getElementById("djurbant-hvc-summary-live");
          const summaryWarn = document.getElementById("djurbant-hvc-summary-warning");
          const summaryErr = document.getElementById("djurbant-hvc-summary-error");
          const presetButtons = Array.from(document.querySelectorAll(".djurbant-hvc-apply-preset"));

          const URL_OR_PATH_RE = /^(https?:\/\/|mailto:|\.{0,2}\/|#|\/)[^\s]*$/i;

          function getModuleInputs(moduleKey) {
            return inputs.filter((el) => String(el.dataset.module || "") === moduleKey);
          }

          function validateInput(el) {
            if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
              return "ok";
            }
            el.classList.remove("djurbant-hvc-field-error", "djurbant-hvc-field-warning");
            const isCheckbox = el instanceof HTMLInputElement && el.type === "checkbox";
            const rawValue = isCheckbox ? (el.checked ? "1" : "") : String(el.value || "").trim();
            const required = el.dataset.required === "1";
            const recommended = el.dataset.recommended === "1";
            const validate = String(el.dataset.validate || "");

            if (required && rawValue === "") {
              el.classList.add("djurbant-hvc-field-error");
              return "error";
            }
            if (validate === "url_or_path" && rawValue !== "" && !URL_OR_PATH_RE.test(rawValue)) {
              el.classList.add("djurbant-hvc-field-error");
              return "error";
            }
            if (recommended && rawValue === "") {
              el.classList.add("djurbant-hvc-field-warning");
              return "warning";
            }
            return "ok";
          }

          function moduleStatus(moduleEl) {
            const key = String(moduleEl.dataset.moduleKey || "");
            const moduleInputs = getModuleInputs(key);
            let hasError = false;
            let hasWarning = false;
            moduleInputs.forEach((el) => {
              const state = validateInput(el);
              if (state === "error") hasError = true;
              if (state === "warning") hasWarning = true;
            });
            return hasError ? "error" : hasWarning ? "warning" : "live";
          }

          function renderModuleBadge(moduleEl, status) {
            const badge = moduleEl.querySelector("[data-module-status]");
            if (!badge) return;
            badge.classList.remove("is-live", "is-warning", "is-error");
            if (status === "error") {
              badge.textContent = "Error";
              badge.classList.add("is-error");
            } else if (status === "warning") {
              badge.textContent = "Warning";
              badge.classList.add("is-warning");
            } else {
              badge.textContent = "Live";
              badge.classList.add("is-live");
            }
          }

          function runValidation() {
            let liveCount = 0;
            let warningCount = 0;
            let errorCount = 0;
            modules.forEach((moduleEl) => {
              const status = moduleStatus(moduleEl);
              renderModuleBadge(moduleEl, status);
              if (status === "error") errorCount += 1;
              else if (status === "warning") warningCount += 1;
              else liveCount += 1;
            });
            if (summaryLive) summaryLive.textContent = `Live: ${liveCount}`;
            if (summaryWarn) summaryWarn.textContent = `Warnings: ${warningCount}`;
            if (summaryErr) summaryErr.textContent = `Errors: ${errorCount}`;
          }

          function applyPreset(moduleKey, preset) {
            const moduleInputs = getModuleInputs(moduleKey);
            const byPath = (path) => moduleInputs.find((el) => String(el.dataset.fieldPath || "") === path);
            if (preset === "global_default") {
              const label = byPath("global.ctaDefaults.bookLabel");
              const url = byPath("global.ctaDefaults.bookUrl");
              const reply = byPath("global.meta.replySlaText");
              if (label) label.value = "Book";
              if (url) url.value = "./contact.html";
              if (reply) reply.value = "We usually reply within 24 hours.";
            } else if (preset === "social_enable_all" || preset === "social_disable_all") {
              const enabled = preset === "social_enable_all";
              moduleInputs.forEach((el) => {
                if (el instanceof HTMLInputElement && el.type === "checkbox") {
                  el.checked = enabled;
                }
              });
            } else if (preset === "home_rainbow_default") {
              const title = byPath("pages.home.bestOf.title");
              const cta = byPath("pages.home.bookingBand.buttonLabel");
              const ctaUrl = byPath("pages.home.bookingBand.buttonUrl");
              if (title) title.value = "The Best of Artist";
              if (cta) cta.value = "Book";
              if (ctaUrl) ctaUrl.value = "./contact.html";
            } else if (preset === "video_default") {
              const title = byPath("pages.video.title");
              const intro = byPath("pages.video.intro");
              const top = byPath("pages.video.topButton.label");
              if (title) title.value = "Video";
              if (intro) intro.value = "Ranked from fetched video channel stats.";
              if (top) top.value = "Top Video";
            } else if (preset === "audio_default") {
              const title = byPath("pages.audio.title");
              const intro = byPath("pages.audio.intro");
              const top = byPath("pages.audio.topButton.label");
              if (title) title.value = "Audio";
              if (intro) intro.value = "Ranked from fetched audio channel stats.";
              if (top) top.value = "Top Audio";
            } else if (preset === "contact_default") {
              const title = byPath("pages.contact.title");
              const intro = byPath("pages.contact.introText");
              const action = byPath("pages.contact.formAction");
              if (title) title.value = "Contact DJ UrbanT";
              if (intro) intro.value = "Use this form for bookings, event inquiries, collaborations, and press.";
              if (action) action.value = "mailto:booking@djurbant.com";
            }
            runValidation();
          }

          if (expandAllBtn) {
            expandAllBtn.addEventListener("click", () => {
              modules.forEach((m) => m.open = true);
            });
          }
          if (collapseAllBtn) {
            collapseAllBtn.addEventListener("click", () => {
              modules.forEach((m) => m.open = false);
            });
          }

          presetButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
              const moduleKey = String(btn.dataset.moduleKey || "");
              if (!moduleKey) return;
              const select = document.querySelector(`.djurbant-hvc-preset-select[data-module-key="${moduleKey}"]`);
              if (!(select instanceof HTMLSelectElement)) return;
              const value = String(select.value || "");
              if (!value) return;
              applyPreset(moduleKey, value);
            });
          });

          inputs.forEach((el) => {
            el.addEventListener("input", runValidation);
            el.addEventListener("change", runValidation);
          });
          runValidation();
        })();
      </script>
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

function djurbant_hvc_add_visual_cms_rewrite_rule() {
    add_rewrite_rule("^visual-cms/?$", "index.php?djurbant_hvc_visual_cms=1", "top");
}
add_action("init", "djurbant_hvc_add_visual_cms_rewrite_rule");

function djurbant_hvc_register_visual_cms_query_var($vars) {
    $vars[] = "djurbant_hvc_visual_cms";
    return $vars;
}
add_filter("query_vars", "djurbant_hvc_register_visual_cms_query_var");

function djurbant_hvc_visual_cms_template_redirect() {
    $request_path = trim(
        strval(
            wp_parse_url($_SERVER["REQUEST_URI"] ?? "", PHP_URL_PATH)
        ),
        "/"
    );
    $is_pretty_path = strtolower($request_path) === "visual-cms";
    $is_query_var_path = intval(get_query_var("djurbant_hvc_visual_cms", 0)) === 1;
    if (!$is_pretty_path && !$is_query_var_path) {
        return;
    }
    $target = admin_url("admin.php?page=djurbant-headless-visual-cms");
    wp_safe_redirect($target, 302);
    exit;
}
add_action("template_redirect", "djurbant_hvc_visual_cms_template_redirect");

function djurbant_hvc_activate_plugin() {
    djurbant_hvc_add_visual_cms_rewrite_rule();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, "djurbant_hvc_activate_plugin");

function djurbant_hvc_deactivate_plugin() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, "djurbant_hvc_deactivate_plugin");
