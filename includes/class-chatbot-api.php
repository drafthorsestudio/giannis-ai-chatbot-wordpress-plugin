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
        // REGISTRAZIONE DEGLI HOOK (Doppia sicurezza sui nomi)
        $actions = array('giannis_get_config', 'giannis_chatbot_get_config');
        
        foreach ($actions as $action) {
            // Per gli utenti loggati
            add_action("wp_ajax_{$action}", array($this, 'get_config'));
            // Per gli OSPITI (Incognito) - Fondamentale
            add_action("wp_ajax_nopriv_{$action}", array($this, 'get_config'));
        }

        // Hook per l'invio messaggi
        add_action('wp_ajax_giannis_send_message', array($this, 'send_message'));
        add_action('wp_ajax_nopriv_giannis_send_message', array($this, 'send_message'));
    }
    
    /**
     * IL LASCIAPASSARE
     * Se sei admin controlla la sicurezza. Se sei ospite, passa pure.
     */
    private function verify_security_check() {
        // Se l'utente è un ospite (non loggato), ritorna TRUE immediatamente.
        // Questo risolve il problema della Cache di Pantheon e del 403.
        if (!is_user_logged_in()) {
            return true;
        }

        // Se è loggato, facciamo il controllo standard
        $nonce = isset($_POST['nonce']) ? sanitize_text_field($_POST['nonce']) : '';
        if (!wp_verify_nonce($nonce, 'giannis_chatbot_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'), 403);
            exit;
        }
        return true;
    }
    
    public function get_config() {
        // 1. Applichiamo il lasciapassare
        $this->verify_security_check();
        
        // 2. Recuperiamo le impostazioni dal database
        $settings = get_option('giannis_chatbot_settings');
        
        // 3. Fallback di sicurezza: se il DB è vuoto, usa questi dati (modificali se serve)
        $api_url = !empty($settings['api_url']) ? $settings['api_url'] : 'https://signpost-ia-app.azurewebsites.net/agent';
        $team_id = !empty($settings['team_id']) ? $settings['team_id'] : ''; 
        $agent_id = !empty($settings['agent_id']) ? intval($settings['agent_id']) : 0;

        // 4. Inviamo la risposta
        wp_send_json_success(array(
            'SIGNPOST_API_URL' => $api_url,
            'TEAM_ID'          => $team_id,
            'AGENT_ID'         => $agent_id
        ));
        
        // IMPORTANTE: Ferma l'esecuzione per non stampare "0"
        wp_die();
    }
    
    public function send_message() {
        $this->verify_security_check();
        
        $settings = get_option('giannis_chatbot_settings');
        $message = isset($_POST['message']) ? sanitize_text_field($_POST['message']) : '';
        $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
        
        if (empty($message)) {
            wp_send_json_error(array('message' => 'Message cannot be empty'));
            wp_die();
        }

        $api_url = !empty($settings['api_url']) ? $settings['api_url'] : 'https://signpost-ia-app.azurewebsites.net/agent';
        $agent_id = !empty($settings['agent_id']) ? intval($settings['agent_id']) : 0;
        $team_id = !empty($settings['team_id']) ? $settings['team_id'] : '';
        
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
        } else {
            $body = wp_remote_retrieve_body($response);
            // Decodifichiamo e re-inviamo per essere sicuri del formato JSON
            $data = json_decode($body, true);
            wp_send_json_success($data);
        }
        wp_die();
    }
}