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
    
    public function get_config() {
        check_ajax_referer('giannis_chatbot_nonce', 'nonce');
        
        $settings = get_option('giannis_chatbot_settings');
        
        wp_send_json_success(array(
            'SIGNPOST_API_URL' => $settings['api_url'],
            'TEAM_ID' => $settings['team_id'],
            'AGENT_ID' => intval($settings['agent_id'])
        ));
    }
    
    public function send_message() {
        check_ajax_referer('giannis_chatbot_nonce', 'nonce');
        
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