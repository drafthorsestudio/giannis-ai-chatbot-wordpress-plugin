<?php
class Giannis_Chatbot_API {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
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
        
        // If user is logged in, always require valid nonce
        if (is_user_logged_in()) {
            if (!wp_verify_nonce($nonce, 'giannis_chatbot_nonce')) {
                wp_send_json_error(array('message' => 'Security check failed'), 403);
                exit;
            }
            return true;
        }
        
        // For non-logged-in users, verify nonce but don't block on failure
        // This handles cached pages with stale nonces (common on Pantheon)
        if ($nonce && !wp_verify_nonce($nonce, 'giannis_chatbot_nonce')) {
            // Log for debugging but allow the request
            error_log('Giannis Chatbot: Stale nonce detected (likely cached page). Allowing guest request.');
        }
        
        return true;
    }
    
    public function get_config() {
        $this->verify_nonce_with_cache_fallback();
        
        $settings = get_option('giannis_chatbot_settings');
        
        wp_send_json_success(array(
            'SIGNPOST_API_URL' => $settings['api_url'],
            'TEAM_ID' => $settings['team_id'],
            'AGENT_ID' => intval($settings['agent_id'])
        ));
    }
    
    public function send_message() {
        $this->verify_nonce_with_cache_fallback();
        
        $settings = get_option('giannis_chatbot_settings');
        $message = sanitize_text_field($_POST['message']);
        $session_id = sanitize_text_field($_POST['session_id']);
        
        $response = wp_remote_post($settings['api_url'], array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'id' => intval($settings['agent_id']),
                'team_id' => $settings['team_id'],
                'message' => $message,
                'uid' => $session_id,
                'to_number' => null,
                'audio' => null
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => 'Connection error: ' . $response->get_error_message()));
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        wp_send_json_success($data);
    }
}