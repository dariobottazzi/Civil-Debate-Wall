"""
    :copyright: (c) 2011 Local Projects, all rights reserved
    :license: Affero GNU GPL v3, see LEGAL/LICENSE for more details.
"""
from cdw.forms import PostForm
from cdw.services import cdw
from cdwapi import (jsonify, not_found_on_error, 
                    auth_token_or_logged_in_required)                          
from flask import request, current_app
from flaskext.login import current_user

def load_views(blueprint):
    
    @blueprint.route('/threads/<id>', methods=['GET'])
    @not_found_on_error
    def threads_show(id):
        thread = cdw.threads.with_id(id)
        result = thread.as_dict()
        result.update({
            "posts": [p.as_dict() for p in cdw.posts.with_fields(**{"thread": thread})]
        })
        return jsonify(result)
    
    @blueprint.route('/threads/<id>/remove', methods=['POST'])
    @not_found_on_error
    @auth_token_or_logged_in_required
    def threads_remove(id):
        return jsonify(cdw.delete_thread(cdw.threads.with_id(id)))
    
    @blueprint.route('/threads/<id>/posts', methods=['GET'])
    @not_found_on_error
    def threads_posts_get(id):
        return jsonify(cdw.posts.with_fields(
                    **{"thread":cdw.threads.with_id(id)}))
    
    @blueprint.route('/threads/<thread_id>/posts', methods=['POST'])
    @not_found_on_error
    @auth_token_or_logged_in_required
    def threads_posts_post(thread_id):
        thread = cdw.threads.with_id(thread_id)
        form = PostForm(request.form, csrf_enabled=False)
        
        if form.validate():
            post = form.to_post()
            follow_sms = form.get_follow_sms() 
            follow_email = form.get_follow_email()
            
            # Assume kiosk users want to follow by SMS, even if they haven't
            # provided their phone number since the SMS service is intelligent
            # enough to ignore users without phone numbers
            if form.origin.data == 'kiosk':
                follow_sms = True
                
            post = cdw.post_to_thread(thread, post, follow_sms, follow_email)    
            return jsonify(post)
        else:
            return jsonify({"errors": form.errors}, 400)
        
