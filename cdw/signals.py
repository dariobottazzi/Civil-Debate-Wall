"""
    :copyright: (c) 2011 Local Projects, all rights reserved
    :license: Affero GNU GPL v3, see LEGAL/LICENSE for more details.
"""
import social
from flask import current_app, redirect, session, flash

def on_social_login_failed(sender, provider_id, oauth_response):
    """When social login fails, redirect to register
    """
    current_app.logger.debug('Handling social login failed signal.')
    session['facebooktoken'] = oauth_response['access_token']
    session['oauth_login_fail_url'] = '/register/%s' % provider_id
    
    
def init(app):    
    social.social_login_failed.connect(on_social_login_failed, app)

