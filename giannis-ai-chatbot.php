<?php
/**
 * Plugin Name: Giannis AI Chatbot
 * Plugin URI: https://antitraffickingresponse.org
 * Description: A modern AI chatbot interface powered by Signpost AI
 * Version: 1.0.8
 * Author: IRC AT
 * Author URI: https://antitraffickingresponse.org
 * License: GPL v2 or later
 * Text Domain: giannis-ai-chatbot
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GIANNIS_CHATBOT_VERSION', '1.0.6');
define('GIANNIS_CHATBOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GIANNIS_CHATBOT_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once GIANNIS_CHATBOT_PLUGIN_DIR . 'includes/class-chatbot-settings.php';
require_once GIANNIS_CHATBOT_PLUGIN_DIR . 'includes/class-chatbot-api.php';
require_once GIANNIS_CHATBOT_PLUGIN_DIR . 'includes/class-chatbot-shortcode.php';

// Initialize plugin
class Giannis_AI_Chatbot {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Initialize components
        Giannis_Chatbot_Settings::get_instance();
        Giannis_Chatbot_API::get_instance();
        Giannis_Chatbot_Shortcode::get_instance();
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register activation/deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function enqueue_assets() {
        $load_assets = !is_admin();
        
        if ($load_assets) {
            // Google Fonts
            wp_enqueue_style(
                'giannis-google-fonts',
                'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
                array(),
                null
            );
            
            // Main plugin CSS with all fixes
            wp_enqueue_style(
                'giannis-chatbot-style',
                GIANNIS_CHATBOT_PLUGIN_URL . 'assets/css/chatbot-style.css',
                array(),
                GIANNIS_CHATBOT_VERSION . '.1' // Bump version to force cache refresh
            );
            
            // JavaScript
            wp_enqueue_script(
                'giannis-chatbot-script',
                GIANNIS_CHATBOT_PLUGIN_URL . 'assets/js/chatbot-script.js',
                array('jquery'),
                GIANNIS_CHATBOT_VERSION . '.1', // Bump version
                true
            );
            
            // Pass configuration
            wp_localize_script('giannis-chatbot-script', 'giannisConfig', array(
                'apiUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('giannis_chatbot_nonce'),
                'pluginUrl' => GIANNIS_CHATBOT_PLUGIN_URL
            ));
        }
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Giannis AI Chatbot', 'giannis-ai-chatbot'),
            __('Giannis Chatbot', 'giannis-ai-chatbot'),
            'manage_options',
            'giannis-chatbot',
            array('Giannis_Chatbot_Settings', 'render_settings_page'),
            'dashicons-format-chat',
            30
        );
    }
    
    public function activate() {
        // Set default options
        if (!get_option('giannis_chatbot_settings')) {
            add_option('giannis_chatbot_settings', array(
                'api_url' => 'https://signpost-ia-app.azurewebsites.net/agent',
                'team_id' => '',
                'agent_id' => ''
            ));
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Initialize the plugin
Giannis_AI_Chatbot::get_instance();
