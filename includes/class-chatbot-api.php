<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Giannis_Chatbot_API {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Register AJAX actions for both logged-in users and guests
        add_action('wp_ajax_giannis_get_config', array($this, 'get_config'));
        add_action('wp_ajax_nopriv_giannis_get_config', array($this, 'get_config'));
        
        add_action('wp_ajax_giannis_send_message', array($this, 'send_message'));
        add_action('wp_ajax_nopriv_giannis_send_message', array($this, 'send_message'));
    }
    
    /**
     * Verify nonce with cache-friendly fallback for non-logged-in users.
     * Pantheon and other aggressive caching systems may serve stale nonces.
     * For public chatbot features, we allow requests without valid nonce for guests.
     */
    private function verify_nonce_with_cache_fallback() {
        $nonce = isset($_POST['nonce']) ? sanitize_text_field($_POST['nonce']) : '';
        
        // If user is logged in, always require valid nonce (Strict Security)
        if (is_user_logged_in()) {
            if (!wp_verify_nonce($nonce, 'giannis_chatbot_nonce')) {
                wp_send_json_error(array('message' => 'Security check failed'), 403);
                exit;
            }
            return true;
        }
        
        // For non-logged-in users (Guests), allow stale nonces due to caching
        // We log it for debugging but don't block the chat
        if ($nonce && !wp_verify_nonce($nonce, 'giannis_chatbot_nonce')) {
            error_log('Giannis Chatbot: Stale nonce detected (likely cached page). Allowing guest request.');
        }
        
        return true;
    }
    
    public function get_config() {
        $this->verify_nonce_with_cache_fallback();
        
        $settings = get_option('giannis_chatbot_settings');
        
        // Safety check if settings are empty
        if (!$settings) {
            wp_send_json_error(array('message' => 'Plugin not configured'), 500);
            return;
        }
        
        wp_send_json_success(array(
            'SIGNPOST_API_URL' => isset($settings['api_url']) ? $settings['api_url'] : '',
            'TEAM_ID' => isset($settings['team_id']) ? $settings['team_id'] : '',
            'AGENT_ID' => isset($settings['agent_id']) ? intval($settings['agent_id']) : 0
        ));
    }
    
    public function send_message() {
        $this->verify_nonce_with_cache_fallback();
        
        $settings = get_option('giannis_chatbot_settings');
        
        // Input sanitization with safety checks
        $message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
        $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
        
        if (empty($message)) {
            wp_send_json_error(array('message' => 'Message cannot be empty'));
            return;
        }

        $api_url = isset($settings['api_url']) ? $settings['api_url'] : '';
        $agent_id = isset($settings['agent_id']) ? intval($settings['agent_id']) : 0;
        $team_id = isset($settings['team_id']) ? $settings['team_id'] : '';
        
        $response = wp_remote_post($api_url, array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'id' => $agent_id,
                'team_id' => $team_id,
                'message' => $message,
                'uid' => $session_id,
                'to_number' => null,
                'audio' => null
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => 'Connection error: ' . $response->get_error_message()));
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        wp_send_json_success($data);
    }
}