<?php
class Giannis_Chatbot_Settings {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    public function register_settings() {
        register_setting('giannis_chatbot_settings_group', 'giannis_chatbot_settings', array(
            'sanitize_callback' => array($this, 'sanitize_settings')
        ));
        
        add_settings_section(
            'giannis_chatbot_api_section',
            'API Configuration',
            array($this, 'api_section_callback'),
            'giannis-chatbot'
        );
        
        add_settings_field(
            'api_url',
            'API URL',
            array($this, 'api_url_callback'),
            'giannis-chatbot',
            'giannis_chatbot_api_section'
        );
        
        add_settings_field(
            'team_id',
            'Team ID',
            array($this, 'team_id_callback'),
            'giannis-chatbot',
            'giannis_chatbot_api_section'
        );
        
        add_settings_field(
            'agent_id',
            'Agent ID',
            array($this, 'agent_id_callback'),
            'giannis-chatbot',
            'giannis_chatbot_api_section'
        );
    }
    
    public function sanitize_settings($input) {
        $sanitized = array();
        $sanitized['api_url'] = esc_url_raw($input['api_url']);
        $sanitized['team_id'] = sanitize_text_field($input['team_id']);
        $sanitized['agent_id'] = absint($input['agent_id']);
        return $sanitized;
    }
    
    public function api_section_callback() {
        echo '<p>Enter your Signpost AI API credentials below.</p>';
    }
    
    public function api_url_callback() {
        $settings = get_option('giannis_chatbot_settings');
        $value = isset($settings['api_url']) ? $settings['api_url'] : '';
        echo '<input type="text" name="giannis_chatbot_settings[api_url]" value="' . esc_attr($value) . '" class="regular-text" />';
    }
    
    public function team_id_callback() {
        $settings = get_option('giannis_chatbot_settings');
        $value = isset($settings['team_id']) ? $settings['team_id'] : '';
        echo '<input type="text" name="giannis_chatbot_settings[team_id]" value="' . esc_attr($value) . '" class="regular-text" />';
    }
    
    public function agent_id_callback() {
        $settings = get_option('giannis_chatbot_settings');
        $value = isset($settings['agent_id']) ? $settings['agent_id'] : '';
        echo '<input type="number" name="giannis_chatbot_settings[agent_id]" value="' . esc_attr($value) . '" class="regular-text" />';
    }
    
    public static function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Giannis AI Chatbot Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('giannis_chatbot_settings_group');
                do_settings_sections('giannis-chatbot');
                submit_button();
                ?>
            </form>
            
            <hr>
            
            <h2>How to Use</h2>
            <p>Add the chatbot to any page or post using this shortcode:</p>
            <code>[giannis_chatbot]</code>
            
            <h3>Shortcode Attributes (Optional)</h3>
            <ul>
                <li><code>height</code> - Set custom height (default: 600px)</li>
                <li><code>width</code> - Set custom width (default: 100%)</li>
            </ul>
            
            <p>Example: <code>[giannis_chatbot height="800px"]</code></p>
        </div>
        <?php
    }
}