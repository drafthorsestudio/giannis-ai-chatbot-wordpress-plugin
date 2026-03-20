<?php
/**
 * API Handler for Giannis AI Chatbot
 * Handles communication with Signpost AI API
 */

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
     * Return configuration to frontend
     */
    public function get_config() {
        check_ajax_referer('giannis_chatbot_nonce', 'nonce');
        
        $settings = get_option('giannis_chatbot_settings');
        
        // Validate settings
        if (empty($settings['team_id']) || empty($settings['agent_id'])) {
            wp_send_json_error(array(
                'message' => 'API credentials not configured. Please configure in WordPress Admin → Giannis Chatbot.'
            ));
            return;
        }
        
        wp_send_json_success(array(
            'SIGNPOST_API_URL' => $settings['api_url'],
            'TEAM_ID' => $settings['team_id'],
            'AGENT_ID' => intval($settings['agent_id'])
        ));
    }
    
    /**
     * Send message to Signpost AI API
     */
    public function send_message() {
        check_ajax_referer('giannis_chatbot_nonce', 'nonce');
        
        $settings = get_option('giannis_chatbot_settings');
        $message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
        $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
        
        // Validate inputs
        if (empty($message)) {
            wp_send_json_error(array(
                'message' => 'No message provided.'
            ));
            return;
        }
        
        if (empty($settings['team_id']) || empty($settings['agent_id'])) {
            wp_send_json_error(array(
                'message' => 'API credentials not configured.'
            ));
            return;
        }
        
        // Prepare request body
        $body = array(
            'id' => intval($settings['agent_id']),
            'team_id' => $settings['team_id'],
            'message' => $message,
            'uid' => $session_id,
            'to_number' => null,
            'audio' => null
        );
        
        // Log request for debugging (optional - comment out in production)
        error_log('Giannis Chatbot API Request: ' . json_encode($body));
        
        // Make API request with extended timeout and retry logic
        $response = $this->make_api_request($settings['api_url'], $body);
        
        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            error_log('Giannis Chatbot API Error: ' . $error_message);
            
            // User-friendly error messages
            $user_message = $this->get_user_friendly_error($error_message);
            
            wp_send_json_error(array(
                'message' => $user_message,
                'technical_error' => $error_message // For debugging
            ));
            return;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body_response = wp_remote_retrieve_body($response);
        
        // Log response for debugging
        error_log('Giannis Chatbot API Response Code: ' . $status_code);
        
        if ($status_code !== 200) {
            error_log('Giannis Chatbot API Error Response: ' . $body_response);
            wp_send_json_error(array(
                'message' => 'The AI service returned an error. Please try again.',
                'status_code' => $status_code
            ));
            return;
        }
        
        $data = json_decode($body_response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error(array(
                'message' => 'Invalid response from AI service.'
            ));
            return;
        }
        
        wp_send_json_success($data);
    }
    
    /**
     * Make API request with retry logic
     */
    private function make_api_request($url, $body, $attempt = 1, $max_attempts = 2) {
        $timeout = 45; // Increased from default 30 seconds
        
        // Increase timeout on retry
        if ($attempt > 1) {
            $timeout = 60;
        }
        
        $args = array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode($body),
            'timeout' => $timeout,
            'method' => 'POST',
            'httpversion' => '1.1',
            'sslverify' => true, // Change to false if SSL issues occur
            'blocking' => true,
        );
        
        $response = wp_remote_post($url, $args);
        
        // If timeout and we haven't hit max attempts, retry
        if (is_wp_error($response)) {
            $error_code = $response->get_error_code();
            
            // cURL error 28 is timeout
            if (strpos($error_code, 'http_request_failed') !== false && $attempt < $max_attempts) {
                error_log("Giannis Chatbot: Retry attempt {$attempt} due to timeout");
                sleep(1); // Wait 1 second before retry
                return $this->make_api_request($url, $body, $attempt + 1, $max_attempts);
            }
        }
        
        return $response;
    }
    
    /**
     * Convert technical errors to user-friendly messages
     */
    private function get_user_friendly_error($error_message) {
        // Timeout errors
        if (strpos($error_message, 'cURL error 28') !== false || 
            strpos($error_message, 'timed out') !== false ||
            strpos($error_message, 'timeout') !== false) {
            return 'The AI service is taking longer than expected to respond. Please try again.';
        }
        
        // Connection errors
        if (strpos($error_message, 'cURL error 7') !== false ||
            strpos($error_message, 'Could not resolve host') !== false) {
            return 'Unable to connect to the AI service. Please check your internet connection and try again.';
        }
        
        // SSL errors
        if (strpos($error_message, 'SSL') !== false ||
            strpos($error_message, 'certificate') !== false) {
            return 'There was a security certificate error connecting to the AI service.';
        }
        
        // Generic fallback
        return 'There was an error connecting to the AI service. Please try again in a moment.';
    }
    
    /**
     * Test API connection (for admin settings page)
     */
    public function test_connection() {
        $settings = get_option('giannis_chatbot_settings');
        
        if (empty($settings['team_id']) || empty($settings['agent_id'])) {
            return array(
                'success' => false,
                'message' => 'Please configure API credentials first.'
            );
        }
        
        $body = array(
            'id' => intval($settings['agent_id']),
            'team_id' => $settings['team_id'],
            'message' => 'Test connection',
            'uid' => 'test-' . time(),
            'to_number' => null,
            'audio' => null
        );
        
        $response = $this->make_api_request($settings['api_url'], $body);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $this->get_user_friendly_error($response->get_error_message()),
                'technical' => $response->get_error_message()
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        
        if ($status_code === 200) {
            return array(
                'success' => true,
                'message' => 'Connection successful!'
            );
        }
        
        return array(
            'success' => false,
            'message' => 'Connection failed with status code: ' . $status_code
        );
    }
}
