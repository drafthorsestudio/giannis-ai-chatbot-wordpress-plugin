# Giannis AI Chatbot - WordPress Plugin

A modern, elegant AI chatbot WordPress plugin featuring a sleek interface with dark/light mode, chat history management, and seamless integration with Signpost AI.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![WordPress](https://img.shields.io/badge/wordpress-5.0%2B-blue.svg)
![PHP](https://img.shields.io/badge/php-7.4%2B-purple.svg)
![License](https://img.shields.io/badge/license-GPL--2.0-green.svg)

## ✨ Features

- 🎨 **Modern UI Design** - Clean, premium interface with smooth animations and IRC color palette (black, yellow, grey)
- 💬 **Chat Management** - Create, rename, and delete multiple chat sessions with persistent history
- 🌓 **Dark/Light Mode** - Toggle between themes with user preference persistence
- 📝 **Markdown Support** - Bold text formatting in bot responses
- ⌨️ **Typewriter Effect** - Smooth character-by-character bot message display
- 💾 **Local Storage** - Chat history persists between sessions using browser localStorage
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🔒 **Secure** - WordPress nonces, sanitization, and proper escaping throughout
- 🌍 **Translation Ready** - Fully internationalized and ready for translations
- ⚡ **Performance Optimized** - Conditional script loading (only loads on pages with shortcode)

## 📋 Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Signpost AI API credentials (Team ID and Agent ID)

## 🚀 Installation

### Method 1: WordPress Admin (Recommended)

1. Download the latest release ZIP file from [Releases](../../releases)
2. In WordPress admin, go to **Plugins → Add New → Upload Plugin**
3. Choose the downloaded ZIP file and click **Install Now**
4. Click **Activate Plugin**
5. Go to **Settings → Giannis Chatbot** to configure

### Method 2: Manual Installation

1. Download and unzip the plugin files
2. Upload the `giannis-ai-chatbot` folder to `/wp-content/plugins/`
3. Activate the plugin through the **Plugins** menu in WordPress
4. Go to **Settings → Giannis Chatbot** to configure

### Method 3: Using Git (For Developers)

```bash
cd /path/to/wordpress/wp-content/plugins/
git clone https://github.com/yourusername/giannis-ai-chatbot.git
```

Then activate through WordPress admin.

## ⚙️ Configuration

### 1. Get Your API Credentials

You'll need Signpost AI credentials:
- **Team ID** - Your team identifier (UUID format)
- **Agent ID** - Your agent identifier (numeric)

### 2. Configure the Plugin

1. In WordPress admin, navigate to **Settings → Giannis Chatbot**
2. Enter your API credentials:
   - **API URL**: `https://signpost-ia-app.azurewebsites.net/agent` (default)
   - **Team ID**: Your Signpost AI team ID
   - **Agent ID**: Your Signpost AI agent ID
3. Click **Save Changes**

### 3. Add to Your Site

Add the chatbot to any page or post using the shortcode:

```
[giannis_chatbot]
```

#### Shortcode Attributes

Customize the chatbot appearance with optional attributes:

```
[giannis_chatbot height="800px" width="100%"]
```

**Available Attributes:**
- `height` - Set custom height (default: `600px`)
- `width` - Set custom width (default: `100%`)

**Examples:**
```
[giannis_chatbot height="100vh"]
[giannis_chatbot height="700px" width="90%"]
```

## 📁 Plugin Structure

```
giannis-ai-chatbot/
├── giannis-ai-chatbot.php          # Main plugin file
├── readme.txt                       # WordPress.org plugin readme
├── README.md                        # This file
├── LICENSE                          # GPL-2.0 license
├── assets/
│   ├── css/
│   │   └── chatbot-style.css       # All styling and themes
│   ├── js/
│   │   └── chatbot-script.js       # Chat logic and API integration
│   └── images/
│       ├── giannis-logo.png        # Light mode logo
│       └── giannis-logo-grey.png   # Dark mode logo
├── includes/
│   ├── class-chatbot-settings.php  # Settings page handler
│   ├── class-chatbot-api.php       # API integration and AJAX handlers
│   └── class-chatbot-shortcode.php # Shortcode registration and rendering
└── templates/
    └── chatbot-template.php        # Chat interface template
```

## 🎨 Customization

### Color Palette

The plugin uses the IRC color palette defined in CSS variables:

```css
--irc-black: #000000;
--irc-yellow: #FFC20E;
--irc-dark-grey: #333333;
--irc-light-grey: #F2F2F2;
--irc-white: #FFFFFF;
```

To customize colors, you can override these CSS variables in your theme's `style.css`:

```css
.giannis-chatbot-wrapper {
    --irc-yellow: #your-color;
    --accent-color: #your-color;
}
```

### Typography

Uses the Inter font family from Google Fonts. To change:

1. Edit `giannis-ai-chatbot.php`
2. Find the `enqueue_assets()` method
3. Modify the Google Fonts URL

### Custom Styling

Add custom CSS to your theme targeting the `.giannis-chatbot-wrapper` class:

```css
.giannis-chatbot-wrapper .message-content {
    border-radius: 20px;
    /* Your custom styles */
}
```

## 🔧 Development

### Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/giannis-ai-chatbot.git
cd giannis-ai-chatbot
```

2. Symlink to WordPress plugins directory:
```bash
ln -s /path/to/giannis-ai-chatbot /path/to/wordpress/wp-content/plugins/
```

3. Enable WordPress debug mode in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### File Modifications

**JavaScript (`assets/js/chatbot-script.js`):**
- Configuration loaded via WordPress AJAX (`wp_ajax_giannis_get_config`)
- API calls routed through WordPress (`wp_ajax_giannis_send_message`)
- Uses `giannisConfig` object (localized script data)

**CSS (`assets/css/chatbot-style.css`):**
- Scoped to `.giannis-chatbot-wrapper` to prevent theme conflicts
- Uses CSS custom properties for easy theming
- Responsive breakpoints for mobile/tablet/desktop

**PHP Files:**
- Follow WordPress Coding Standards
- All inputs sanitized, all outputs escaped
- Uses WordPress nonces for security
- Implements singleton pattern for main classes

### WordPress Hooks Available

For theme/plugin developers who want to extend functionality:

```php
// Modify chatbot settings before save
add_filter('giannis_chatbot_settings_sanitize', function($settings) {
    // Your custom logic
    return $settings;
});

// Add custom scripts/styles
add_action('giannis_chatbot_enqueue_scripts', function() {
    wp_enqueue_style('my-custom-chatbot-style', ...);
});

// Modify API response before sending to frontend
add_filter('giannis_chatbot_api_response', function($response) {
    // Your custom logic
    return $response;
});
```

## 🐛 Known Issues

- Chat history is stored locally in browser - clearing browser data will delete chats
- API rate limits may apply depending on your Signpost AI plan
- Long conversations may impact browser performance due to localStorage size limits

## 🔐 Security

This plugin implements WordPress security best practices:

- ✅ Nonces for all AJAX requests
- ✅ Input sanitization using WordPress functions
- ✅ Output escaping throughout
- ✅ Capability checks for admin functions
- ✅ No direct file access allowed
- ✅ SQL injection prevention (uses WordPress functions)
- ✅ XSS prevention (proper escaping)

### Reporting Security Issues

Please report security vulnerabilities privately to: [your-email@example.com]

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards

- Follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/)
- Use meaningful variable and function names
- Comment complex logic
- Test on multiple WordPress versions
- Ensure mobile responsiveness

## 📝 Changelog

### Version 1.0.0 (2024-11-25)
- Initial release
- Core chatbot functionality
- Dark/light mode toggle
- Chat history management
- Responsive design
- WordPress admin settings page
- Shortcode implementation
- Translation ready

## 🆘 Support

- **Documentation**: [Link to docs]
- **Issues**: [GitHub Issues](../../issues)
- **Feedback Form**: [https://form.typeform.com/to/rpVbmnoi](https://form.typeform.com/to/rpVbmnoi)

## 📄 License

This project is licensed under the GPL v2 or later - see the [LICENSE](LICENSE) file for details.

```
Giannis AI Chatbot WordPress Plugin
Copyright (C) 2024 [Your Name/Organization]

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
```

## 👥 Credits

- **Original Design**: [Designer name]
- **Development**: [Your name/team]
- **Icon/Logo**: [Attribution if applicable]
- **Signpost AI**: API provider

## 🗺️ Roadmap

Future enhancements under consideration:

- [ ] User authentication integration
- [ ] Save chat history to WordPress database
- [ ] Export chat conversations
- [ ] Multiple agent support
- [ ] Widget for sidebar/footer
- [ ] Elementor/Gutenberg blocks
- [ ] Analytics dashboard
- [ ] Custom trigger buttons
- [ ] Email transcript feature
- [ ] Multi-language UI out of the box

## 📧 Contact

For questions, feature requests, or partnerships:

- **Email**: [your-email@example.com]
- **Website**: [https://yourwebsite.com](https://yourwebsite.com)
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

---

**Made with ❤️ for the WordPress community**

*If you find this plugin helpful, please consider giving it a ⭐ on GitHub!*